# Fix Plan: 41 Half-Baked Issues

## Progress Summary

| Phase | Status | Notes |
|-------|--------|--------|
| **Phase 1** Navigation Wiring | ✅ Complete | 8/8 — `onNavigate` wired; WorkflowList `onRun` shows toast. |
| **Phase 2** Button Handlers | ✅ Complete | 12/12 — List view, bulk delete, dropdowns, Credentials edit/delete/add/test, Settings save/avatar, Execution refresh/retry. |
| **Phase 3** Mock Data Italic | ✅ Complete | 9/9 — StatCard, ActivityItem, ExecutionChart; spurious italic removed from WorkflowCard/WorkflowPreview labels. |
| **Phase 4** Polish & Edge Cases | ✅ Complete | 12/12 — Delete AlertDialog, notification toasts, sort logic, CredentialModal validation, activity clickable, responsive sidebar, Showcase nodes, empty states verified, Sonner `theme="dark"`. |

**Last updated:** After full implementation per `.cursor/plans/lovable_fix_plan_implementation_9720376e.plan.md`.

---

## Task Brief

**What this is:** A prioritized punch list of 41 incomplete or non-functional items discovered during a full page-by-page audit of the newly assembled multi-page app. The app was migrated from `reference-app/` into the active project — all pages render, but many buttons, navigation triggers, and data styling rules are stubbed out or missing.

**How the audit was done:** Every page (Dashboard, Workflows, Executions, Credentials, Templates, Settings, Components, Editor) was visited in the browser preview. Every button, link, toggle, dropdown, and interactive element was clicked or inspected. Console logs, empty handlers, and visual inconsistencies were recorded.

**What "done" looks like:** Every button does something meaningful (navigates, shows toast, opens modal, or mutates local state). All mock/placeholder text is italicized per the project's data-display constraint. No dead clicks remain.

---

## Phase 1: Navigation Wiring (8 fixes) ✅

These are the highest priority because the app has pages but no way to reach them from within the UI — users can only navigate via the sidebar.

### 1.1 `src/App.tsx` — Pass `onNavigate` to all pages ✅
- **Issue:** Pages receive no callback to trigger navigation. Buttons that should switch pages are wired to `console.log` or empty handlers.
- **Fix:** Define `onNavigate: (page: string) => void` wrapping `setCurrentPage`, pass as prop to every page component.

### 1.2 `src/pages/Dashboard.tsx` — 4 dead navigation buttons ✅
- **"Browse Templates" button** (line ~35) → `console.log` → should call `onNavigate('templates')`
- **"Create Workflow" button** (line ~28) → `console.log` → should call `onNavigate('editor')`
- **"View All" link** (line ~42) → `console.log` → should call `onNavigate('workflows')`
- **WorkflowPreview `onEdit`** (line ~55) → `console.log` → should call `onNavigate('editor')`

### 1.3 `src/pages/WorkflowList.tsx` — 3 dead navigation buttons + WorkflowCard onRun ✅
- **"Create Workflow" button** (line ~51) → no handler → should call `onNavigate('editor')`
- **WorkflowCard `onEdit`** (line ~119) → `console.log('Edit', id)` → should call `onNavigate('editor')`
- **EmptyState action** (line ~131) → `console.log('Create workflow')` → should call `onNavigate('editor')`

### 1.4 `src/pages/ExecutionHistory.tsx` — Row click does nothing ✅
- **ExecutionRow `onView`** → `console.log` → should show toast "Execution detail view coming soon" (no detail page exists yet)

### 1.5 `src/pages/Credentials.tsx` — Empty state action ✅
- Already opens the modal correctly. No change needed.

### 1.6 `src/pages/AgentLibrary.tsx` — Template action buttons ✅
- **TemplateCard `onUse`** → `console.log` → should call `onNavigate('editor')`
- **TemplateCard `onPreview`** → `console.log` → should show toast "Template preview coming soon"

### 1.7 `src/pages/Settings.tsx` — Security section buttons ✅
- **"Change Password"** → no handler → show toast "Coming soon"
- **"Two-Factor Auth"** → no handler → show toast "Coming soon"
- **"API Keys"** → no handler → should call `onNavigate('credentials')`
- **"Delete Account"** → no handler → should open confirmation dialog

### 1.8 `src/pages/ShowcasePage.tsx` — No navigation needed ✅

---

## Phase 2: Button Handlers & Functional Logic (12 fixes) ✅

These are buttons that exist visually but do nothing when clicked. They should perform local-state operations or show feedback toasts.

### 2.1 `src/pages/WorkflowList.tsx` — List view mode is broken ✅
- **Issue:** Grid/List toggle switches `viewMode` state, but both modes render the identical card grid.
- **Fix:** When `viewMode === 'list'`, render a compact table-row layout (status dot, name, truncated description, node count, last run, run button).

### 2.2 `src/pages/WorkflowList.tsx` — Bulk delete has no selection mechanism ✅
- **Issue:** Delete button appears when `selectedWorkflows.length > 0` but there's no UI to select workflows. The `toggleSelection` function exists but is unused (has `@ts-expect-error`).
- **Fix:** Add checkbox to each WorkflowCard, wire `toggleSelection`, wire delete button to remove from local state.

### 2.3 `src/components/workflow/WorkflowCard.tsx` — No "More" menu ✅
- **Issue:** Card has no three-dot menu for Edit/Duplicate/Delete actions.
- **Fix:** Add a `DropdownMenu` with Edit (→ `onEdit`), Duplicate (toast), Disable (toast), Delete (toast).

### 2.4 `src/components/dashboard/WorkflowPreview.tsx` — No "More" menu ✅
- **Issue:** Same as above but for the dashboard's compact cards.
- **Fix:** Add dropdown: Edit, View Executions.

### 2.5 `src/pages/ExecutionHistory.tsx` — "Refresh" button is dead ✅
- **Issue:** Refresh icon button has no handler.
- **Fix:** Wire to reset filters and show toast "Refreshed".

### 2.6 `src/components/execution/ExecutionRow.tsx` — "Retry" button is dead ✅
- **Issue:** Retry button on error rows does nothing.
- **Fix:** Show toast "Retrying execution…"

### 2.7 `src/pages/Credentials.tsx` — Edit and Delete handlers missing ✅
- **Issue:** CredentialCard has Edit/Delete buttons that log to console.
- **Fix:** Edit opens modal pre-filled, Delete shows confirmation then removes from local state.

### 2.8 `src/pages/Credentials.tsx` — "Add Credential" modal submit ✅
- **Issue:** Modal "Add" button doesn't save anything.
- **Fix:** Validate inputs (name + service required), add to local state array, close modal, show success toast.

### 2.9 `src/components/credentials/CredentialCard.tsx` — "Test" button ✅
- **Issue:** Test connection button does nothing.
- **Fix:** Show brief loading spinner, then toast "Connection successful".

### 2.10 `src/pages/Settings.tsx` — "Save Changes" missing ✅
- **Issue:** Profile form fields are editable but there's no save button.
- **Fix:** Add "Save Changes" button, wire to toast "Profile updated".

### 2.11 `src/pages/Settings.tsx` — "Change Avatar" button ✅
- **Issue:** Avatar area has no upload interaction.
- **Fix:** Wire click to toast "Avatar upload coming soon".

### 2.12 `src/components/dashboard/WorkflowPreview.tsx` & `WorkflowCard.tsx` — "Run" button feedback ✅
- **Issue:** `onRun` callbacks log to console with no user feedback.
- **Fix:** Show toast "Workflow started successfully" with the workflow name.

---

## Phase 3: Mock Data Italicization (9 fixes) ✅

The project has a constraint that all mock/placeholder data must be italicized. These items were missed or incorrectly applied.

### 3.1–3.5 — Already compliant ✅
Dashboard stat cards, WorkflowList cards, ExecutionHistory rows, Credentials cards, and AgentLibrary template cards all correctly apply `italic` to mock data text.

### 3.6 `src/components/ui-custom/FormInput.tsx` — SKIP
- FormInput properly passes `className` to input where needed; no fix required.

### 3.7 `src/components/ui-custom/StatCard.tsx` — StatCard values not italic ✅
- **Issue:** `ui-custom/StatCard.tsx` renders `value` prop without `italic` class.
- **Where:** `src/components/ui-custom/StatCard.tsx` — value `<p>` tag. **Done:** Added `italic`.

### 3.8 `src/components/ui-custom/ActivityItem.tsx` — ActivityItem mock data not italic ✅
- **Issue:** ActivityItem titles, descriptions, and timestamps rendered as normal text.
- **Where:** `src/components/ui-custom/ActivityItem.tsx`. **Done:** Italic on title, description, timestamp.

### 3.9 `src/components/dashboard/ExecutionChart.tsx` — ExecutionChart labels not italic ✅
- **Issue:** Chart axis labels ("Jan", "Feb", etc.) are mock data but rendered in normal style.
- **Where:** `src/components/dashboard/ExecutionChart.tsx` — month label spans. **Done:** Added `italic`.

- **Additional:** WorkflowCard and WorkflowPreview — only numeric/mock values are italic; UI labels ("nodes", "runs") are not. ✅

---

## Phase 4: Polish & Edge Cases (12 fixes) ✅

Lower priority items that improve completeness and robustness.

### 4.1 `src/pages/Settings.tsx` — "Delete Account" needs confirmation dialog ✅
- **Fix:** Wrap in `AlertDialog`: "Are you sure? This cannot be undone." Confirm shows toast "Account deletion not available in demo mode."

### 4.2 `src/pages/Settings.tsx` — Notification toggle feedback ✅
- **Fix:** Show subtle toast "Preference saved" when toggling notification switches.

### 4.3 `src/pages/WorkflowList.tsx` — Sort dropdown doesn't sort ✅
- **Issue:** `sortBy` state changes but `filteredWorkflows` is never sorted.
- **Fix:** Add sort logic: name (alphabetical), lastRun (most recent), created (array order).

### 4.4 `src/components/credentials/CredentialModal.tsx` — No form validation ✅
- **Fix:** Require name + service fields. Disable submit until filled. Show inline error on empty API key.

### 4.5 `src/components/workflow/SearchBar.tsx` — Clear button ✅
- Already working; no change.

### 4.6 `src/components/workflow/WorkflowCard.tsx` & WorkflowPreview — Italic on UI labels ✅
- **Issue:** Words like "nodes" and "executions" (UI chrome) are italicized alongside their mock data numbers.
- **Fix:** Only the numeric values should be italic, not the label words.

### 4.7 `src/pages/Dashboard.tsx` — Activity feed items not clickable ✅
- **Fix:** Make activity feed items clickable → navigate to executions page.

### 4.8 `src/pages/ExecutionHistory.tsx` — Status chip counts ✅
- Already working correctly.

### 4.9 Responsive layout — Sidebar collapse on mobile ✅
- **Fix:** Verify sidebar collapse works on smaller viewports. Verify grid layouts go single-column.

### 4.10 `src/pages/ShowcasePage.tsx` — Canvas nodes overlap ✅
- **Issue:** `CanvasNode` uses `absolute` positioning inside a `relative` div — nodes stack on top of each other.
- **Fix:** Wrap each node in a `relative` container with explicit dimensions, or override positioning.

### 4.11 Empty state consistency ✅
- **Fix:** Verify Credentials and Executions empty states both use `EmptyState` component with appropriate icons.

### 4.12 Toast system — Dark theme visibility ✅
- **Fix:** Confirm `sonner` toasts are visible on the dark background. Add `theme="dark"` to `<Toaster>` if needed.

---

## Files Affected

| File | Phases | Fix Count |
|------|--------|-----------|
| `src/App.tsx` | 1 | 1 |
| `src/pages/Dashboard.tsx` | 1, 2, 3, 4 | 6 |
| `src/pages/WorkflowList.tsx` | 1, 2, 4 | 5 |
| `src/pages/ExecutionHistory.tsx` | 1, 2 | 3 |
| `src/pages/Credentials.tsx` | 2 | 3 |
| `src/pages/AgentLibrary.tsx` | 1 | 2 |
| `src/pages/Settings.tsx` | 1, 2, 4 | 7 |
| `src/pages/ShowcasePage.tsx` | 3, 4 | 3 |
| `src/components/workflow/WorkflowCard.tsx` | 2, 4 | 2 |
| `src/components/dashboard/WorkflowPreview.tsx` | 2 | 2 |
| `src/components/ui-custom/StatCard.tsx` | 3 | 1 |
| `src/components/ui-custom/ActivityItem.tsx` | 3 | 1 |
| `src/components/ui-custom/FormInput.tsx` | 3 | 1 |
| `src/components/dashboard/ExecutionChart.tsx` | 3 | 1 |
| `src/components/credentials/CredentialCard.tsx` | 2 | 1 |
| `src/components/credentials/CredentialModal.tsx` | 4 | 1 |
| `src/components/execution/ExecutionRow.tsx` | 2 | 1 |
| `src/components/workflow/SearchBar.tsx` | 4 | 1 |
| `src/components/dashboard/ActivityFeed.tsx` | 4 | 1 |

**Total: 19 files, 41 fixes, 4 phases — all complete.**
