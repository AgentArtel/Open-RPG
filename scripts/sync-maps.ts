#!/usr/bin/env npx tsx
/**
 * CLI: Sync TMX map entities and metadata to Supabase.
 *
 *   npx tsx scripts/sync-maps.ts           # sync all maps from world file
 *   npx tsx scripts/sync-maps.ts simplemap  # sync one map
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import { join } from 'path'
import { discoverMapIds, parseTmxFile } from '../src/sync/parseTmx'
import { syncMapEntities, syncAllMaps, type SyncResult } from '../src/sync/syncMapEntities'

const LOG_PREFIX = '[TMX-Sync]'

async function main(): Promise<void> {
  const projectRoot = process.cwd()
  const singleMapId = process.argv[2]?.trim()

  if (singleMapId) {
    await runSingleMap(projectRoot, singleMapId)
  } else {
    await runAllMaps(projectRoot)
  }
}

async function runSingleMap(projectRoot: string, mapId: string): Promise<void> {
  console.log(`${LOG_PREFIX} Syncing single map: ${mapId}`)
  try {
    const parsed = parseTmxFile(projectRoot, mapId)
    const result = await syncMapEntities(parsed.mapId, parsed.entities, parsed.metadata)
    printResult(result)
    if (result.error) process.exitCode = 1
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${LOG_PREFIX} ${msg}`)
    process.exitCode = 1
  }
}

async function runAllMaps(projectRoot: string): Promise<void> {
  const mapIds = discoverMapIds(projectRoot)
  console.log(`${LOG_PREFIX} Syncing maps from main/worlds/myworld.world... (${mapIds.length} maps)`)
  const results = await syncAllMaps(projectRoot)
  let totalCreated = 0
  let totalUpdated = 0
  let totalDeleted = 0
  let totalConfigsCreated = 0
  let totalConfigsUpdated = 0
  for (const r of results) {
    printResult(r)
    if (r.error) process.exitCode = 1
    totalCreated += r.entitiesCreated
    totalUpdated += r.entitiesUpdated
    totalDeleted += r.entitiesDeleted
    totalConfigsCreated += r.configsCreated
    totalConfigsUpdated += r.configsUpdated
  }
  const totalEntities = totalCreated + totalUpdated
  console.log(
    `${LOG_PREFIX} Done. ${totalEntities} entities synced across ${results.length} maps.` +
      (totalConfigsCreated + totalConfigsUpdated > 0
        ? ` (${totalConfigsCreated} skeleton configs created, ${totalConfigsUpdated} configs updated)`
        : '')
  )
}

function printResult(r: SyncResult): void {
  const entityCount = r.entitiesCreated + r.entitiesUpdated
  const parts: string[] = []
  if (r.entitiesCreated) parts.push(`${r.entitiesCreated} created`)
  if (r.entitiesUpdated) parts.push(`${r.entitiesUpdated} updated`)
  if (r.entitiesDeleted) parts.push(`${r.entitiesDeleted} deleted`)
  const configParts: string[] = []
  if (r.configsCreated) configParts.push(`${r.configsCreated} skeleton config(s) created`)
  if (r.configsUpdated) configParts.push(`${r.configsUpdated} config(s) updated`)
  console.log(
    `  ${r.mapId}: ${entityCount} entities` +
      (parts.length ? ` (${parts.join(', ')})` : '') +
      (configParts.length ? ` — ${configParts.join(', ')}` : '')
  )
  if (r.error) console.error(`    Error: ${r.error}`)
}

main().catch((err) => {
  console.error(`${LOG_PREFIX} Fatal:`, err)
  process.exit(1)
})
