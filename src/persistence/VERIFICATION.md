# TASK-013: Player State Persistence — How to Verify

## 1. Script (DB round-trip)

From project root, with Supabase env vars set (e.g. in `.env`):

```bash
npx tsx src/persistence/test-manual.ts
```

- **Supabase configured**: Saves a test row, loads it back, deletes it. Expect: `All checks passed`.
- **Supabase not set**: Exits 0 with a skip message (no failure).

## 2. Live server + logs

1. Start the game server:
   ```bash
   rpgjs dev
   ```

2. Open the game in the browser and connect (one player).

3. Move the character somewhere (e.g. walk to a different tile).

4. **Disconnect**: close the tab or refresh.

   - In the **server logs** you should see something like:
     - `[PlayerState] Saved state for "<playerId>" (map=simplemap, x=..., y=...)`

5. Reconnect (reopen or refresh and re-enter the game).

   - In the **server logs** you should see:
     - `[PlayerState] Loaded state for "<playerId>" (map=simplemap, x=..., y=...)`
     - `[PlayerState] Restored "<playerId>" to map=simplemap (x, y)`

6. The character should appear at the same position (and map) as before disconnect.

## 3. Database (Supabase Table Editor)

1. After at least one player has **disconnected** (step 4 above), open your Supabase project.

2. Go to **Table Editor** → **public** → **player_state**.

3. You should see one row per player who has ever disconnected:
   - `player_id`, `name`, `map_id`, `position_x`, `position_y`, `direction`, `state_data`, `created_at`, `updated_at`.

4. Re-run the flow: move, disconnect, then refresh the Table Editor — the same row should update (`updated_at` and position columns).

## Troubleshooting

- **No `[PlayerState]` logs**: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set where the server runs (e.g. `.env` for local, Railway env vars for production).
- **Table empty**: Run the migration `supabase/migrations/002_player_state.sql` in the Supabase SQL Editor if you haven’t already.
- **Player doesn’t restore**: Check server logs for `[PlayerState] Restore error` or `Failed to restore map`; if the saved map was removed, the player falls back to default spawn.
