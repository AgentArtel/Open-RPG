## TASK-002: Fork EvenDemoApp and set up Flutter project structure

- **Status**: PENDING
- **Assigned**: cursor
- **Priority**: P1-High
- **Type**: Create
- **Depends on**: none
- **Blocks**: TASK-006, TASK-008

### Context

The `glasses-apps/EvenDemoApp/` directory is currently empty. The reference
Flutter app lives at https://github.com/even-realities/EvenDemoApp.git. We need
to clone it and prepare it for ClawLens modifications without breaking the
existing BLE functionality.

### Objective

A working Flutter project in `glasses-apps/EvenDemoApp/` that builds successfully,
preserves all stock EvenDemoApp functionality, and has the directory structure
ready for ClawLens additions.

### Specifications

1. Clone the EvenDemoApp repo into `glasses-apps/EvenDemoApp/`
2. Verify `flutter pub get` succeeds
3. Verify `flutter analyze` passes (or document pre-existing warnings)
4. Verify `flutter build apk` completes
5. Create placeholder files for ClawLens additions:
   - `lib/services/openclaw_bridge.dart` — empty class skeleton with TODO
   - `lib/services/message_router.dart` — empty class skeleton with TODO
6. Add WebSocket dependency to `pubspec.yaml`:
   ```yaml
   dependencies:
     web_socket_channel: ^2.4.0
   ```
7. Verify build still passes after adding dependency

### Acceptance Criteria

- [ ] `flutter pub get` succeeds
- [ ] `flutter analyze` passes (or only pre-existing warnings)
- [ ] `flutter build apk` completes
- [ ] Placeholder service files exist with TODO comments
- [ ] `web_socket_channel` dependency added and resolved
- [ ] Original EvenDemoApp functionality preserved (no modifications to existing files)

### Do NOT

- Modify any existing EvenDemoApp source files
- Add implementation logic to placeholder files
- Change the app name or package ID
- Remove any existing dependencies
- Modify `glasses-apps/EH-InNovel/` (read-only reference)

### Handoff Notes

_Updated by assigned agent when status changes._
