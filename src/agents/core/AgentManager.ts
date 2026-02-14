/**
 * AgentManager — loads YAML configs, wires subsystems, spawns AI NPCs on the map
 *
 * Implements IAgentManager. One shared LaneQueue and LLMClient for all agents.
 * Uses a mutable contextProvider per agent so that when the RpgEvent spawns it
 * can set getContext to a closure over the event (buildRunContext).
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
import {
  moveSkill,
  saySkill,
  createLookSkill,
  emoteSkill,
  waitSkill,
} from '../skills'
import type { IAgentSkill } from '../skills/types'
import { createAgentMemory } from '../memory'
import { bridge } from '../bridge'
import { GameChannelAdapter } from '../bridge/GameChannelAdapter'
import { setSpawnContext } from './spawnContext'

const LOG_PREFIX = '[AgentManager]'

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

  return {
    id,
    name,
    graphic,
    personality,
    model: modelConfig,
    skills,
    spawn,
    behavior,
  }
}

/** Skill map: name → skill or factory (look needs PerceptionEngine). */
function registerSkillsFromConfig(
  registry: SkillRegistry,
  perception: PerceptionEngine,
  skillNames: ReadonlyArray<string>
): void {
  const skillMap: Record<string, IAgentSkill | ((pe: PerceptionEngine) => IAgentSkill)> = {
    move: moveSkill,
    say: saySkill,
    look: createLookSkill,
    emote: emoteSkill,
    wait: waitSkill,
  }
  for (const name of skillNames) {
    const skillOrFactory = skillMap[name]
    if (skillOrFactory) {
      if (typeof skillOrFactory === 'function') {
        registry.register(skillOrFactory(perception))
      } else {
        registry.register(skillOrFactory)
      }
    }
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
  private configsLoaded = false
  private readonly spawnedMaps = new Set<string>()

  async loadConfigs(configDir: string): Promise<void> {
    if (this.configsLoaded) return
    const resolved = path.isAbsolute(configDir) ? configDir : path.join(process.cwd(), configDir)
    if (!fs.existsSync(resolved)) {
      console.warn(`${LOG_PREFIX} Config dir does not exist: ${resolved}`)
      this.configsLoaded = true
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
    this.configsLoaded = true
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
    if (!this.configsLoaded) {
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
    if (!this.configsLoaded) {
      await this.loadConfigs('src/config/agents')
    }
    if (!AgentNpcEventClass) {
      console.error(`${LOG_PREFIX} AgentNpcEvent class not set — cannot spawn.`)
      return false
    }
    const instance = this.agents.get(configId)
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

  async dispose(): Promise<void> {
    for (const agentId of Array.from(this.agents.keys())) {
      await this.removeAgent(agentId)
    }
    this.spawnedMaps.clear()
    this.configsLoaded = false
    console.log(`${LOG_PREFIX} Disposed`)
  }
}
