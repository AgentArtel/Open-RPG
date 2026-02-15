/**
 * Sync parsed TMX entities and map metadata to Supabase.
 *
 * Upserts game.map_entities and game.map_metadata; for ai-npc entities
 * creates skeleton agent_configs or updates only spawn/graphic (never overwrites Studio).
 */

import { getSupabaseClient } from '../config/supabase'
import type { MapEntity, MapMetadata } from './parseTmx'

const LOG_PREFIX = '[TMX-Sync]'

export interface SyncResult {
  mapId: string
  entitiesCreated: number
  entitiesUpdated: number
  entitiesDeleted: number
  configsCreated: number
  configsUpdated: number
  error?: string
}

/** Row shape for map_entities upsert (DB columns). */
interface MapEntityRow {
  id: string
  map_id: string
  entity_type: string
  display_name: string | null
  position_x: number
  position_y: number
  tiled_class: string | null
  role: string | null
  sprite: string
  ai_enabled: boolean
  tools: string[]
  area_id: string | null
  metadata: Record<string, unknown>
  agent_config_id: string | null
}

/** Convert MapEntity to DB row (no agent_config_id yet). */
function entityToRow(e: MapEntity, agentConfigId: string | null): MapEntityRow {
  return {
    id: e.id,
    map_id: e.map_id,
    entity_type: e.entity_type,
    display_name: e.display_name,
    position_x: e.position_x,
    position_y: e.position_y,
    tiled_class: e.tiled_class,
    role: e.role,
    sprite: e.sprite,
    ai_enabled: e.ai_enabled,
    tools: e.tools,
    area_id: e.area_id,
    metadata: e.metadata,
    agent_config_id: agentConfigId,
  }
}

/**
 * Sync one map's entities and metadata to Supabase.
 * For ai-npc: create skeleton agent_config if missing, or update only spawn + graphic.
 */
export async function syncMapEntities(
  mapId: string,
  entities: MapEntity[],
  metadata: MapMetadata
): Promise<SyncResult> {
  const client = getSupabaseClient()
  if (!client) {
    return {
      mapId,
      entitiesCreated: 0,
      entitiesUpdated: 0,
      entitiesDeleted: 0,
      configsCreated: 0,
      configsUpdated: 0,
      error: 'Supabase client not available (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)',
    }
  }

  const result: SyncResult = {
    mapId,
    entitiesCreated: 0,
    entitiesUpdated: 0,
    entitiesDeleted: 0,
    configsCreated: 0,
    configsUpdated: 0,
  }

  try {
    // Resolve agent_config_id for each ai-npc (create skeleton or update spawn/graphic)
    const entityRows: MapEntityRow[] = []
    for (const e of entities) {
      let agentConfigId: string | null = null
      if (e.entity_type === 'ai-npc') {
        const configId = await ensureAgentConfig(client, e, result)
        agentConfigId = configId
      }
      entityRows.push(entityToRow(e, agentConfigId))
    }

    const currentIds = new Set(entities.map((e) => e.id))
    const { data: existingRows } = await client
      .from('map_entities')
      .select('id')
      .eq('map_id', mapId)

    const existingIds = new Set((existingRows ?? []).map((r: { id: string }) => r.id))
    result.entitiesCreated = 0
    result.entitiesUpdated = 0
    for (const id of currentIds) {
      if (existingIds.has(id)) result.entitiesUpdated += 1
      else result.entitiesCreated += 1
    }

    // Upsert map_entities (on conflict id, map_id)
    const { error: upsertError } = await client
      .from('map_entities')
      .upsert(entityRows, { onConflict: 'id,map_id' })

    if (upsertError) {
      result.error = upsertError.message
      return result
    }

    // Delete entities that are in DB but not in current TMX
    const idsToDelete = (existingRows ?? [])
      .map((r: { id: string }) => r.id)
      .filter((id: string) => !currentIds.has(id))
    if (idsToDelete.length > 0) {
      const { data: deleted, error: deleteError } = await client
        .from('map_entities')
        .delete()
        .eq('map_id', mapId)
        .in('id', idsToDelete)
        .select('id')
      if (!deleteError && deleted) result.entitiesDeleted = deleted.length
    }

    // Upsert map_metadata
    await client.from('map_metadata').upsert(
      {
        map_id: metadata.map_id,
        description: metadata.description ?? null,
        theme: metadata.theme ?? null,
        ambient: metadata.ambient ?? null,
      },
      { onConflict: 'map_id' }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.error = msg
  }
  return result
}

/**
 * Ensure agent_config exists for this ai-npc entity.
 * If not: insert skeleton (enabled=false, empty personality).
 * If yes: update only spawn and graphic.
 * Returns the agent_config id.
 */
async function ensureAgentConfig(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  e: MapEntity,
  result: SyncResult
): Promise<string> {
  const id = e.id
  const spawn = { map: e.map_id, x: e.position_x, y: e.position_y }
  const graphic = e.sprite
  const name = e.display_name ?? id

  const { data: existing } = await client
    .from('agent_configs')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (existing) {
    await client
      .from('agent_configs')
      .update({ spawn, graphic })
      .eq('id', id)
    result.configsUpdated += 1
    return id
  }

  await client.from('agent_configs').insert({
    id,
    name,
    graphic,
    personality: '',
    model: { idle: 'kimi-k2-0711-preview', conversation: 'kimi-k2-0711-preview' },
    skills: ['move', 'say', 'look', 'emote', 'wait'],
    spawn,
    behavior: { idleInterval: 15000, patrolRadius: 3, greetOnProximity: true },
    enabled: false,
    inventory: [],
  })
  result.configsCreated += 1
  return id
}

/**
 * Sync all maps discovered from the world file (discover + parse + sync).
 * Uses process.cwd() as project root. For server hook or CLI "sync all" mode.
 */
export async function syncAllMaps(projectRoot: string = process.cwd()): Promise<SyncResult[]> {
  const { discoverMapIds, parseTmxFile } = await import('./parseTmx')
  const mapIds = discoverMapIds(projectRoot)
  const results: SyncResult[] = []
  for (const mapId of mapIds) {
    try {
      const parsed = parseTmxFile(projectRoot, mapId)
      const result = await syncMapEntities(parsed.mapId, parsed.entities, parsed.metadata)
      results.push(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({
        mapId,
        entitiesCreated: 0,
        entitiesUpdated: 0,
        entitiesDeleted: 0,
        configsCreated: 0,
        configsUpdated: 0,
        error: msg,
      })
    }
  }
  return results
}
