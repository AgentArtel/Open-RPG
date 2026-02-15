/**
 * AgentManager — loads agent configs from Supabase (preferred) or YAML (fallback),
 * wires subsystems, and spawns AI NPCs on the map.
 *
 * Implements IAgentManager. One shared LaneQueue and LLMClient for all agents.
 * Uses a mutable contextProvider per agent so that when the RpgEvent spawns it
 * can set getContext to a closure over the event (buildRunContext).
 *
 * Load order (Supabase-first, per-map):
 *   1. On map load: try loadConfigsFromSupabaseForMap(mapId) — only rows for this map with enabled = true
 *   2. On failure or missing client, fall back to loadConfigs() — reads all YAML once
 *   Builder spawnAgentAt: if agent not registered, try loadConfigFromSupabaseById(configId), else YAML.
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse as parseYaml } from 'yaml'
import type { RpgMap } from '@rpgjs/server'
import type {
  AgentConfig,
  AgentInstance,
  AgentEvent,
  RunContext,
  RunContextProvider,
  IAgentManager,
  AgentModelConfig,
  AgentSpawnConfig,
  AgentBehaviorConfig,
} from './types'
import type { IGameChannelAdapter } from '../bridge/types'
import { AgentRunner } from './AgentRunner'
import { LaneQueue } from './LaneQueue'
import { LLMClient } from './LLMClient'
import { PerceptionEngine } from '../perception/PerceptionEngine'
import { SkillRegistry } from '../skills/SkillRegistry'
import * as skillPlugins from '../skills/plugins'
import type { SkillPlugin, SkillDependencies } from '../skills/plugin'
import { createAgentMemory } from '../memory'
import { bridge } from '../bridge'
import { GameChannelAdapter } from '../bridge/GameChannelAdapter'
import { setSpawnContext } from './spawnContext'
import { getSupabaseClient } from '../../config/supabase'

const LOG_PREFIX = '[AgentManager]'

// ---------------------------------------------------------------------------
// Supabase row → AgentConfig mapping
// ---------------------------------------------------------------------------

/** Shape of a row from the agent_configs Supabase table. */
interface AgentConfigRow {
  id: string
  name: string
  graphic: string
  personality: string
  model: Record<string, unknown> | null
  skills: string[] | null
  spawn: Record<string, unknown> | null
  behavior: Record<string, unknown> | null
  inventory?: string[] | null
}

/**
 * Convert a Supabase agent_configs row into an AgentConfig.
 * Returns null for invalid/incomplete rows (logs a warning and skips).
 */
function rowToAgentConfig(row: AgentConfigRow): AgentConfig | null {
  const { id, name, graphic, personality } = row
  if (!id || !name || !graphic || !personality) {
    console.warn(`${LOG_PREFIX} Skipping DB row: missing id, name, graphic, or personality`)
    return null
  }

  // Model — jsonb with idle/conversation keys
  const modelRaw = row.model as Record<string, unknown> | undefined
  const idle = modelRaw && typeof modelRaw.idle === 'string' ? modelRaw.idle : 'kimi-k2-0711-preview'
  const conversation = modelRaw && typeof modelRaw.conversation === 'string' ? modelRaw.conversation : idle
  const model: AgentModelConfig = { idle, conversation }

  // Skills — text[] column
  const skills: string[] = Array.isArray(row.skills)
    ? row.skills.filter((s): s is string => typeof s === 'string')
    : ['move', 'say', 'look', 'emote', 'wait']

  // Spawn — jsonb with map, x, y
  const spawnRaw = row.spawn as Record<string, unknown> | undefined
  if (!spawnRaw || typeof spawnRaw.map !== 'string' || typeof spawnRaw.x !== 'number' || typeof spawnRaw.y !== 'number') {
    console.warn(`${LOG_PREFIX} Skipping DB row "${id}": spawn must have map, x, y`)
    return null
  }
  const spawn: AgentSpawnConfig = {
    map: spawnRaw.map as string,
    x: spawnRaw.x as number,
    y: spawnRaw.y as number,
  }

  // Behavior — jsonb with idleInterval, patrolRadius, greetOnProximity
  const behaviorRaw = row.behavior as Record<string, unknown> | undefined
  const behavior: AgentBehaviorConfig = {
    idleInterval: (behaviorRaw && typeof behaviorRaw.idleInterval === 'number') ? behaviorRaw.idleInterval : 15000,
    patrolRadius: (behaviorRaw && typeof behaviorRaw.patrolRadius === 'number') ? behaviorRaw.patrolRadius : 3,
    greetOnProximity: behaviorRaw && typeof behaviorRaw.greetOnProximity === 'boolean' ? behaviorRaw.greetOnProximity : true,
  }

  // Inventory — token items the NPC spawns with (enable API integrations)
  const inventory: string[] | undefined = Array.isArray(row.inventory)
    ? row.inventory.filter((s): s is string => typeof s === 'string')
    : undefined
  const inventoryOpt = inventory && inventory.length > 0 ? inventory : undefined

  return { id, name, graphic, personality, model, skills, spawn, behavior, inventory: inventoryOpt }
}

/** Snapshot of one agent's conversation for the conversation log GUI. */
export interface ConversationSnapshot {
  agentId: string
  npcName: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    metadata?: Record<string, unknown>
  }>
}

/** Internal: instance plus adapter and contextProvider for spawn wiring. */
type ManagedInstance = AgentInstance & {
  adapter: IGameChannelAdapter
  contextProvider: { getContext: RunContextProvider }
}

/** Parse raw YAML object into AgentConfig. */
function parseAgentConfig(raw: unknown, filePath: string): AgentConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o.id === 'string' ? o.id : null
  const name = typeof o.name === 'string' ? o.name : null
  const graphic = typeof o.graphic === 'string' ? o.graphic : null
  const personality = typeof o.personality === 'string' ? o.personality : null
  if (!id || !name || !graphic || !personality) {
    console.warn(`${LOG_PREFIX} Skipping ${filePath}: missing id, name, graphic, or personality`)
    return null
  }
  const model = o.model as Record<string, unknown> | undefined
  const idle = model && typeof model.idle === 'string' ? model.idle : 'kimi-k2-0711-preview'
  const conversation = model && typeof model.conversation === 'string' ? model.conversation : idle
  const modelConfig: AgentModelConfig = { idle, conversation }

  const skillsRaw = o.skills
  const skills: string[] = Array.isArray(skillsRaw)
    ? skillsRaw.filter((s): s is string => typeof s === 'string')
    : ['move', 'say', 'look', 'emote', 'wait']

  const spawnRaw = o.spawn as Record<string, unknown> | undefined
  if (!spawnRaw || typeof spawnRaw.map !== 'string' || typeof spawnRaw.x !== 'number' || typeof spawnRaw.y !== 'number') {
    console.warn(`${LOG_PREFIX} Skipping ${filePath}: spawn must have map, x, y`)
    return null
  }
  const spawn: AgentSpawnConfig = {
    map: spawnRaw.map as string,
    x: spawnRaw.x as number,
    y: spawnRaw.y as number,
  }

  const behaviorRaw = o.behavior as Record<string, unknown> | undefined
  const behavior: AgentBehaviorConfig = {
    idleInterval: (behaviorRaw && typeof behaviorRaw.idleInterval === 'number') ? behaviorRaw.idleInterval : 15000,
    patrolRadius: (behaviorRaw && typeof behaviorRaw.patrolRadius === 'number') ? behaviorRaw.patrolRadius : 3,
    greetOnProximity: behaviorRaw && typeof behaviorRaw.greetOnProximity === 'boolean' ? behaviorRaw.greetOnProximity : true,
  }

  // Inventory — simple string array of item IDs the NPC spawns with
  const inventoryRaw = o.inventory
  const inventory: string[] | undefined = Array.isArray(inventoryRaw)
    ? inventoryRaw.filter((s): s is string => typeof s === 'string')
    : undefined

  return {
    id,
    name,
    graphic,
    personality,
    model: modelConfig,
    skills,
    spawn,
    behavior,
    inventory,
  }
}

/**
 * Register skills from the plugin barrel based on the agent's skill list.
 * Replaces the former hardcoded skillMap — adding a skill now requires only
 * a new file + one barrel export line in plugins.ts.
 */
function registerSkillsFromConfig(
  registry: SkillRegistry,
  perception: PerceptionEngine,
  skillNames: ReadonlyArray<string>
): void {
  const deps: SkillDependencies = { perceptionEngine: perception }

  for (const plugin of Object.values(skillPlugins) as SkillPlugin[]) {
    if (!skillNames.includes(plugin.name)) continue

    // Warn if env vars are missing but still register (in-character failure at execution)
    if (plugin.requiresEnv) {
      const missing = plugin.requiresEnv.filter((v) => !process.env[v])
      if (missing.length > 0) {
        console.warn(`${LOG_PREFIX} Skill "${plugin.name}" missing env: ${missing.join(', ')}`)
      }
    }

    // Factory vs direct: if create expects args, pass deps
    const skill = plugin.create.length > 0
      ? (plugin.create as (d: SkillDependencies) => import('../skills/types').IAgentSkill)(deps)
      : (plugin.create as () => import('../skills/types').IAgentSkill)()
    registry.register(skill)
  }
}

/** AgentNpcEvent class reference — set by the event module to avoid circular import. */
let AgentNpcEventClass: (new (playerId: string) => import('@rpgjs/server').RpgEvent) | null = null

export function setAgentNpcEventClass(Cls: new (playerId: string) => import('@rpgjs/server').RpgEvent): void {
  AgentNpcEventClass = Cls
}

export class AgentManager implements IAgentManager {
  private readonly agents = new Map<string, ManagedInstance>()
  private readonly laneQueue = new LaneQueue()
  private readonly llmClient = new LLMClient()
  /** Set of map ids for which we've already run spawn (Supabase or YAML). */
  private readonly spawnedMaps = new Set<string>()
  /** True after we've loaded all YAML configs (fallback path). */
  private configsLoadedFromYaml = false

  async loadConfigs(configDir: string): Promise<void> {
    if (this.configsLoadedFromYaml) return
    const resolved = path.isAbsolute(configDir) ? configDir : path.join(process.cwd(), configDir)
    if (!fs.existsSync(resolved)) {
      console.warn(`${LOG_PREFIX} Config dir does not exist: ${resolved}`)
      this.configsLoadedFromYaml = true
      return
    }
    const files = fs.readdirSync(resolved).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    for (const file of files) {
      const filePath = path.join(resolved, file)
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const raw = parseYaml(content)
        const config = parseAgentConfig(raw, filePath)
        if (config) {
          await this.registerAgent(config)
          console.log(`${LOG_PREFIX} Loaded config: ${config.id} from ${file}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`${LOG_PREFIX} Failed to load ${filePath}:`, msg)
      }
    }
    this.configsLoadedFromYaml = true
  }

  /**
   * Load agent configs from Supabase for a single map only (enabled = true, spawn.map = mapId).
   * Returns true if Supabase was used (even if 0 rows); false if client missing or query failed.
   */
  async loadConfigsFromSupabaseForMap(mapId: string): Promise<boolean> {
    const client = getSupabaseClient()
    if (!client) {
      console.log(`${LOG_PREFIX} Supabase client not configured — will use YAML fallback`)
      return false
    }

    try {
      // RPC avoids client jsonb filter quirks; returns rows where enabled and spawn.map = mapId
      const { data, error } = await client.rpc('get_agent_configs_for_map', { p_map_id: mapId })

      if (error) {
        console.warn(`${LOG_PREFIX} Supabase query failed for map "${mapId}": ${error.message}`)
        return false
      }

      if (!data || !Array.isArray(data)) {
        console.warn(`${LOG_PREFIX} Supabase returned no data array for map "${mapId}"`)
        return false
      }

      console.log(`${LOG_PREFIX} Supabase returned ${data.length} agent config(s) for map "${mapId}"`)

      for (const row of data) {
        try {
          const config = rowToAgentConfig(row as AgentConfigRow)
          if (config) {
            await this.registerAgent(config)
            console.log(`${LOG_PREFIX} Loaded config: ${config.id} from Supabase`)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`${LOG_PREFIX} Failed to register DB config "${row?.id}":`, msg)
        }
      }

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${LOG_PREFIX} Supabase load error for map "${mapId}":`, msg)
      return false
    }
  }

  /**
   * Load a single agent config from Supabase by id (enabled = true).
   * Used by spawnAgentAt when the agent is not yet registered.
   */
  async loadConfigFromSupabaseById(configId: string): Promise<AgentConfig | null> {
    const client = getSupabaseClient()
    if (!client) return null

    try {
      const { data, error } = await client
        .from('agent_configs')
        .select('*')
        .eq('id', configId)
        .eq('enabled', true)
        .maybeSingle()

      if (error || data == null) return null
      return rowToAgentConfig(data as AgentConfigRow)
    } catch {
      return null
    }
  }

  async registerAgent(config: AgentConfig): Promise<AgentInstance> {
    if (this.agents.has(config.id)) {
      throw new Error(`${LOG_PREFIX} Agent already registered: ${config.id}`)
    }

    const perception = new PerceptionEngine()
    const registry = new SkillRegistry()
    registerSkillsFromConfig(registry, perception, config.skills)

    const memory = createAgentMemory(config.id)
    await memory.load(config.id)

    const contextProvider: { getContext: RunContextProvider } = {
      getContext: async (_event: AgentEvent): Promise<RunContext> => {
        throw new Error(`[AgentManager] Agent ${config.id} not spawned yet — getContext not bound`)
      },
    }

    const getContext: RunContextProvider = (event) => contextProvider.getContext(event)
    const runner = new AgentRunner(config, perception, registry, memory, this.llmClient, getContext)

    const idleIntervalMs = config.behavior?.idleInterval ?? 15000
    const adapter = new GameChannelAdapter({
      agentId: config.id,
      laneQueue: this.laneQueue,
      runner,
      idleIntervalMs,
      logPrefix: `[Adapter:${config.id}]`,
    })

    const instance: ManagedInstance = {
      config,
      runner,
      memory,
      skills: registry,
      perception,
      adapter,
      contextProvider,
    }
    this.agents.set(config.id, instance)
    return instance
  }

  /**
   * Spawn all registered agents that belong on this map.
   * Uses spawn context so AgentNpcEvent can bind getContext and register with bridge.
   */
  async spawnAgentsOnMap(map: RpgMap): Promise<void> {
    if (this.spawnedMaps.has(map.id)) return

    // Load configs for this map only: Supabase (filter by map + enabled) or YAML (all, once)
    const fromSupabase = await this.loadConfigsFromSupabaseForMap(map.id)
    if (!fromSupabase && !this.configsLoadedFromYaml) {
      await this.loadConfigs('src/config/agents')
    }

    if (!AgentNpcEventClass) {
      console.error(`${LOG_PREFIX} AgentNpcEvent class not set — cannot spawn. Call setAgentNpcEventClass from main/events.`)
      return
    }
    for (const [agentId, instance] of this.agents) {
      if (instance.config.spawn.map !== map.id) continue
      const { config } = instance
      setSpawnContext({ config, instance })
      map.createDynamicEvent({
        x: config.spawn.x,
        y: config.spawn.y,
        event: AgentNpcEventClass,
      })
      console.log(`${LOG_PREFIX} Spawned ${agentId} on ${map.id} at (${config.spawn.x}, ${config.spawn.y})`)
    }
    this.spawnedMaps.add(map.id)
  }

  /**
   * Spawn a single AI NPC at a custom (x, y) position on a map.
   * Used by the builder dashboard to place agents anywhere.
   * Does NOT affect spawnedMaps (normal spawn-on-join is unchanged).
   */
  async spawnAgentAt(configId: string, map: RpgMap, x: number, y: number): Promise<boolean> {
    let instance = this.agents.get(configId)
    if (!instance) {
      // Try Supabase first (single row by id, enabled = true)
      const config = await this.loadConfigFromSupabaseById(configId)
      if (config) {
        instance = (await this.registerAgent(config)) as ManagedInstance
      }
      if (!instance && !this.configsLoadedFromYaml) {
        await this.loadConfigs('src/config/agents')
        instance = this.agents.get(configId) ?? undefined
      } else if (!instance) {
        instance = this.agents.get(configId) ?? undefined
      }
    }
    if (!AgentNpcEventClass) {
      console.error(`${LOG_PREFIX} AgentNpcEvent class not set — cannot spawn.`)
      return false
    }
    if (!instance) {
      console.warn(`${LOG_PREFIX} spawnAgentAt: no agent with id "${configId}"`)
      return false
    }
    setSpawnContext({ config: instance.config, instance })
    map.createDynamicEvent({
      x,
      y,
      event: AgentNpcEventClass,
    })
    console.log(`${LOG_PREFIX} [Builder] Spawned ${configId} on ${map.id} at (${x}, ${y})`)
    return true
  }

  /**
   * Snapshot of one agent's conversation for the conversation log GUI.
   */
  getConversationsForPlayer(playerId: string): ConversationSnapshot[] {
    const result: ConversationSnapshot[] = []
    for (const [agentId, agent] of this.agents) {
      const messages = agent.memory.getAllMessages()
      const relevant = messages.filter(
        (m) =>
          (m.role === 'user' && m.metadata?.playerId === playerId) ||
          m.role === 'assistant'
      )
      if (relevant.length > 0) {
        const snapshotMessages = relevant.slice(-50).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
          metadata: m.metadata,
        }))
        result.push({
          agentId,
          npcName: agent.config.name,
          messages: snapshotMessages,
        })
      }
    }
    return result
  }

  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId)
  }

  getAllAgents(): ReadonlyArray<AgentInstance> {
    return Array.from(this.agents.values())
  }

  async removeAgent(agentId: string): Promise<boolean> {
    const instance = this.agents.get(agentId)
    if (!instance) return false
    instance.adapter.dispose()
    if (instance.runner.dispose) {
      void instance.runner.dispose()
    }
    if (instance.memory && 'dispose' in instance.memory) {
      void (instance.memory as { dispose: () => Promise<void> }).dispose()
    }
    this.agents.delete(agentId)
    return true
  }

  /**
   * Clear spawn tracking for a map so agents can be re-spawned on next join.
   * Does NOT remove agent registrations or dispose adapters — just allows
   * spawnAgentsOnMap() to run again for this map. Use from onLeaveMap/onDisconnected
   * when the last player leaves (RPGJS destroys the map and events; we only clear the guard).
   */
  clearMapSpawnState(mapId: string): void {
    this.spawnedMaps.delete(mapId)
    console.log(`${LOG_PREFIX} Cleared spawn state for map: ${mapId}`)
  }

  async dispose(): Promise<void> {
    for (const agentId of Array.from(this.agents.keys())) {
      await this.removeAgent(agentId)
    }
    this.spawnedMaps.clear()
    this.configsLoadedFromYaml = false
    console.log(`${LOG_PREFIX} Disposed`)
  }
}
