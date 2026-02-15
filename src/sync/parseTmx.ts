/**
 * TMX Parser for sync layer
 *
 * Discovers maps from the world file, parses TMX with fast-xml-parser,
 * and extracts map-level properties plus entity objects for game.map_entities.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { XMLParser } from 'fast-xml-parser'

const WORLD_PATH = 'main/worlds/myworld.world'

/** Map-level metadata from TMX <map><properties> */
export interface MapMetadata {
  map_id: string
  description?: string
  theme?: string
  ambient?: string
}

/** One entity row for game.map_entities (TMX-derived) */
export interface MapEntity {
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
}

/** Result of parsing one TMX file */
export interface ParsedMap {
  mapId: string
  metadata: MapMetadata
  entities: MapEntity[]
}

/** Discover TMX map paths from the world file. Returns map IDs (filename without .tmx). */
export function discoverMapIds(projectRoot: string): string[] {
  const worldPath = join(projectRoot, WORLD_PATH)
  const raw = readFileSync(worldPath, 'utf-8')
  const world = JSON.parse(raw) as { maps?: Array<{ fileName: string }> }
  const maps = world.maps ?? []
  return maps.map((m) => {
    const fileName = m.fileName ?? ''
    const base = fileName.replace(/\.tmx$/i, '')
    const lastSlash = base.lastIndexOf('/')
    return lastSlash >= 0 ? base.slice(lastSlash + 1) : base
  })
}

/** Resolve full path to a TMX file by map ID (e.g. simplemap -> main/worlds/maps/simplemap.tmx). */
export function getTmxPath(projectRoot: string, mapId: string): string {
  return join(projectRoot, 'main', 'worlds', 'maps', `${mapId}.tmx`)
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

/** Read and parse a single TMX file; returns parsed map + entities. */
export function parseTmxFile(projectRoot: string, mapId: string): ParsedMap {
  const tmxPath = getTmxPath(projectRoot, mapId)
  const xml = readFileSync(tmxPath, 'utf-8')
  const doc = parser.parse(xml) as Record<string, unknown>
  const mapEl = doc?.map as Record<string, unknown> | undefined
  if (!mapEl) {
    return { mapId, metadata: { map_id: mapId }, entities: [] }
  }

  const metadata = extractMapMetadata(mapId, mapEl)
  const entities = extractEntities(mapId, mapEl)
  return { mapId, metadata, entities }
}

function extractMapMetadata(mapId: string, mapEl: Record<string, unknown>): MapMetadata {
  const out: MapMetadata = { map_id: mapId }
  const props = getPropertyMap(mapEl.properties)
  if (typeof props.description === 'string') out.description = props.description
  if (typeof props.theme === 'string') out.theme = props.theme
  if (typeof props.ambient === 'string') out.ambient = props.ambient
  return out
}

function getPropertyMap(propertiesEl: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!propertiesEl || typeof propertiesEl !== 'object') return out
  const arr = Array.isArray((propertiesEl as Record<string, unknown>).property)
    ? ((propertiesEl as Record<string, unknown>).property as unknown[])
    : [(propertiesEl as Record<string, unknown>).property]
  for (const p of arr) {
    if (!p || typeof p !== 'object') continue
    const name = (p as Record<string, unknown>)['@_name'] as string | undefined
    const value = (p as Record<string, unknown>)['@_value'] as string | undefined
    if (name != null && value != null) out[name] = value
  }
  return out
}

function extractEntities(mapId: string, mapEl: Record<string, unknown>): MapEntity[] {
  const objectgroups = mapEl.objectgroup
  const groups = Array.isArray(objectgroups)
    ? objectgroups
    : objectgroups
      ? [objectgroups]
      : []
  const entities: MapEntity[] = []
  for (const group of groups) {
    const objs = (group as Record<string, unknown>).object
    const list = Array.isArray(objs) ? objs : objs ? [objs] : []
    for (const obj of list) {
      const ent = objectToEntity(mapId, obj as Record<string, unknown>)
      if (ent && ent.id !== 'start') entities.push(ent)
    }
  }
  return entities
}

function objectToEntity(mapId: string, obj: Record<string, unknown>): MapEntity | null {
  const name = obj['@_name'] as string | undefined
  if (name == null || name === '') return null
  const x = parseFloat(String(obj['@_x'] ?? 0))
  const y = parseFloat(String(obj['@_y'] ?? 0))
  const tiledClass = (obj['@_class'] ?? obj['@_type']) as string | undefined
  const props = getPropertyMap(obj.properties)

  const entityType = deriveEntityType(props, obj)
  const displayName =
    (typeof props.displayName === 'string' ? props.displayName : null) ?? name
  const role = typeof props.role === 'string' ? props.role : null
  const sprite = typeof props.sprite === 'string' ? props.sprite : 'female'
  const aiEnabled = props.aiEnabled === 'true'
  const toolsRaw = props.tools
  const tools =
    typeof toolsRaw === 'string'
      ? toolsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []
  const areaId = typeof props.areaId === 'string' ? props.areaId : null

  const knownKeys = new Set([
    'entityType',
    'displayName',
    'role',
    'sprite',
    'aiEnabled',
    'tools',
    'areaId',
  ])
  const metadata: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (knownKeys.has(k)) continue
    metadata[k] = v
  }

  return {
    id: name,
    map_id: mapId,
    entity_type: entityType,
    display_name: displayName,
    position_x: x,
    position_y: y,
    tiled_class: tiledClass ?? null,
    role,
    sprite,
    ai_enabled: aiEnabled,
    tools,
    area_id: areaId,
    metadata,
  }
}

function deriveEntityType(props: Record<string, string>, obj: Record<string, unknown>): string {
  const entityType = props.entityType ?? ''
  if (entityType === 'spawn-point') return 'spawn-point'
  if (entityType === 'object-api') return 'object'
  if (entityType === 'area-marker') return 'area-marker'
  if (entityType === 'trigger') return 'trigger'
  if (entityType === 'ai-npc') return 'ai-npc'
  if (obj['@_type'] != null && String(obj['@_type']).length > 0) return 'ai-npc'
  return 'npc'
}
