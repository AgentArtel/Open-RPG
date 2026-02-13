---
name: GUI design and style improvements
overview: Research is complete. This plan adds TailwindCSS for utility-first GUI styling, a project theme (theme.scss), and redesigns the builder-dashboard with Tailwind classes and v-propagate so the game GUI feels less bland and future GUIs can reuse the same approach. Branch creation is left for you when you run the implementation.
todos: []
isProject: false
---

# GUI design and style improvements

## Research summary

### RPGJS GUI in this project

- **Location**: All game GUIs live in [main/gui/](main/gui/). The only GUI so far is [main/gui/builder-dashboard.vue](main/gui/builder-dashboard.vue) (in-game builder: place AI / Scripted NPCs on the map).
- **Stack**: Vue 3 SFCs, DOM-based (not canvas). GUIs are opened from the server via `player.gui('builder-dashboard').open(...)` and identified by the component `name` in kebab-case.
- **Window wrapper**: The project uses `@rpgjs/default-gui`, which provides `<rpg-window>`. Options used: `width`, `position` (`top` | `bottom` | `middle` | `bottom-middle`), and optionally `height`, `fullWidth`, `arrow`. See [reuse-gui](docs/rpgjs-reference/docs/gui/reuse-gui.md).
- **Theme**: RPGJS injects SCSS variables into every Vue build. It looks for, in order:
  1. `src/config/client/theme.scss`
  2. Root `theme.scss`
  3. Or `rpg.toml` → `themeCss`
  If none exist, the compiler injects a **default theme** (purple gradient window, white border, Arial). Your project has **no theme file**, so all `rpg-window` styling comes from that default; the builder-dashboard uses its own scoped CSS and does not use theme variables.
- **Docs used**: [create-gui](docs/rpgjs-reference/docs/guide/create-gui.md), [gui/theme](docs/rpgjs-reference/docs/gui/theme.md), [gui/reuse-gui](docs/rpgjs-reference/docs/gui/reuse-gui.md), [default-gui window.vue](docs/rpgjs-reference/packages/plugins/default-gui/src/window/window.vue), [tailwindcss](docs/rpgjs-reference/docs/guide/tailwindcss.md), [responsive-design](docs/rpgjs-reference/docs/guide/responsive-design.md).

### Current builder-dashboard styling (why it feels bland)


| Area                 | Current state                                                                  |
| -------------------- | ------------------------------------------------------------------------------ |
| **Typography**       | Generic `Arial`, 12–15px; no hierarchy beyond a single title.                  |
| **Panel**            | Content inside `rpg-window`; padding 8px 12px; flat, no depth or frame.        |
| **Category buttons** | Flat rgba fills, 3px radius, thin border; active state is a blue tint.         |
| **List items**       | Simple hover/selected rgba; no icons or visual distinction for AI vs Scripted. |
| **Primary actions**  | Green “Place” and red “Close”; flat, no hover lift or feedback.                |
| **Place-mode HUD**   | Black bar (`rgba(0,0,0,0.7)`), plain text + cancel button.                     |
| **Theme**            | No project theme; `rpg-window` uses RPGJS default (purple gradient).           |


---

## Official docs review: how RPGJS implements GUI

Reviewing [api-gui](docs/rpgjs-reference/docs/api-gui/) (vue-directive, react) and [gui](docs/rpgjs-reference/docs/gui/) (create-menu, notification-gui, tooltip, theme, reuse-gui, react, react-app, react-tooltip) plus the client/server source shows the following.

### Architecture (official approach)

- **Two GUI kinds**: (1) **Fixed** — full-screen overlay, opened by server `player.gui(id).open(data)` → socket `gui.open` → client `Gui.display(id, data)`. (2) **Attached** — `rpgAttachToSprite: true`, positioned per-sprite via `tooltipPosition()`, shown with `showAttachedGui()` or client `RpgGui.display()`; used for tooltips on sprites.
- **Vue default**: GUIs are Vue components; engine uses `VueGui`. Injectables: `rpgScene`, `rpgCurrentPlayer`, `rpgGuiClose`, `rpgGuiInteraction`, `rpgKeypress`, `rpgSocket`, `rpgGui`, `rpgEngine`. Root container has `pointer-events: none`; each open GUI gets `pointer-events: auto`.
- **Event propagation**: The `**v-propagate**` directive ([api-gui/vue-directive](docs/rpgjs-reference/docs/api-gui/vue-directive.md)) forwards mouse events to the RPGJS canvas. The directive attaches to all `MouseEvent` types and calls `renderer.propagateEvent(ev)`. Use it on any element that should “pass through” clicks to the game (e.g. a transparent overlay).
- **React**: Optional; enabled via `VITE_REACT`. Uses `useEventPropagator()` and `RpgReactContext`. Docs mark it **experimental**. Same server API (`player.gui('id').open(data)`).
- **Server authority**: Opening/closing is server-driven; client `rpgGuiClose(id, data)` emits `gui.exit`. Interactions use `gui.interaction` (name + data); server registers `gui.on('place', handler)`.
- **Theme**: Single global SCSS file; variables injected into every Vue build. Components can define `!default` vars so theme overrides.

### Is this the best approach?


| Aspect                                     | Official approach                                       | Verdict                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vue vs React**                           | Vue first, React experimental.                          | **Stick with Vue** for this project; no need to introduce React.                                                                                                                                                                                                                   |
| **Server-driven open/close**               | Server opens GUI; client closes via socket.             | **Keep it.** Matches builder (onInput → server opens); good for authority and multiplayer.                                                                                                                                                                                         |
| **rpg-window + theme**                     | Reuse default-gui window; style via theme.scss.         | **Best approach.** Add theme.scss and style inside builder; don’t replace rpg-window.                                                                                                                                                                                              |
| **Event propagation**                      | Use `v-propagate` on overlay so canvas receives clicks. | **Prefer over manual** `propagateEvent`. Builder currently uses `@pointerdown="onPlaceModeMapClick"` and calls `rpgEngine.renderer.propagateEvent(ev)`; equivalent is to put `v-propagate` on the place-mode layer and remove the custom handler (scene’s pointerdown still runs). |
| **Styling (SCSS vs Tailwind vs CSS vars)** | Theme is SCSS vars only; no design tokens in docs.      | **Add Tailwind** for utility-first classes as we add more GUIs; keep theme.scss for rpg-window and default-gui. Use Tailwind in Vue templates for layout, spacing, colors, and typography.                                                                                         |


**Conclusion:** The official approach is appropriate. Recommendations: (1) Keep Vue, server-driven open/close, and `rpg-window`. (2) Add theme.scss and Tailwind; use Tailwind utility classes in GUIs for consistency and fast iteration. (3) **Refine place-mode:** use `v-propagate` on the place-mode overlay div instead of manually calling `propagateEvent` in a pointerdown handler—cleaner and matches [api-gui/vue-directive](docs/rpgjs-reference/docs/api-gui/vue-directive.md).

---

## Recommended improvements

### 1. Add a project theme (optional but recommended)

- **Add** a root [theme.scss](theme.scss) (or `src/config/client/theme.scss` if you prefer to keep config under `src/`). Define the variables the default-gui uses so the builder window and any future GUIs (e.g. from default-gui) share one look:
  - `$window-background`, `$window-border`, `$window-border-radius`, `$window-font-family`, `$window-font-size`, `$window-font-color`, plus `$cursor-*` if you use choice UIs.
- **Effect**: The builder’s `<rpg-window>` will pick up this theme. You can choose a palette that matches your game (e.g. darker fantasy, or a clearer “tool” look) and optionally a nicer font (e.g. a single webfont) so the whole game UI feels cohesive.

### 2. Redesign builder-dashboard.vue (main GUI work)

Keep the same structure (categories, lists, place button, close, place-mode overlay) and only improve **design and style**:

- **Typography**
  - Use a distinct font (e.g. one webfont from Google Fonts or a local `@font-face` in theme or in the component). Increase title size and weight; use a slightly smaller, muted font for list labels so hierarchy is clear.
- **Panel and window**
  - Add a bit of depth: e.g. a subtle inner shadow or a second border so the panel doesn’t look flat. Optionally use a glass-style background (e.g. `backdrop-filter: blur(...)` and semi-transparent background) so it feels less “solid box”.
- **Category tabs**
  - Make them read as tabs: e.g. pill or underline active state, slightly bolder text when active, and a clear hover state (e.g. background or border change). Avoid “two identical rectangles” look.
- **List items**
  - Add a small visual cue for “AI NPC” vs “Scripted” (e.g. a tiny icon or colored dot/badge next to the label). Slightly increase padding and use a clear selected state (e.g. left border or background) so the chosen option is obvious.
- **Buttons (Place / Close)**
  - Add hover and active states (e.g. brightness or slight scale/translate) so clicks feel responsive. Optionally use a subtle gradient or shadow so they’re not completely flat.
- **Place-mode overlay**
  - Replace the plain black bar with a clearer “tool” look: e.g. a pill or a small card with a soft shadow and an accent color (or icon) so it reads as “builder instruction” rather than a generic overlay.

Use **Tailwind utility classes** in the template for layout, spacing, colors, typography, and states (hover/active); keep scoped SCSS only where needed for theme variables or one-off rules (e.g. custom keyframes). This sets the pattern for future GUIs.

### 3. Add TailwindCSS (utility-first styling)

- **Why**: Many small, single-purpose utility classes in templates as we add more GUIs; consistent spacing/colors and faster iteration without leaving the template.
- **Steps** (follow [tailwindcss](docs/rpgjs-reference/docs/guide/tailwindcss.md)):
  1. **Install**: `npm install -D tailwindcss postcss autoprefixer`
  2. **Init**: `npx tailwindcss init -p` → creates `tailwind.config.js` and `postcss.config.js`
  3. **Configure content**: In `tailwind.config.js`, set `content` to include all Vue/TS/JS entry points. Include `./index.html` and the game module so GUIs are scanned (e.g. `"./main/**/*.vue"`, `"./index.html"`; exclude `dist` and `node_modules`). See the guide for the exact glob pattern.
  4. **Import directives**: In the project’s main CSS file (create one if the build doesn’t have a global CSS entry), add:
    ```css
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
    ```
     Ensure this file is imported by the client entry (RPGJS build may auto-import a root CSS file or you may need to add it to the client module).
- **Result**: Tailwind classes available in all `main/gui/*.vue` (and elsewhere). Use them in builder-dashboard and future GUIs.

---

## Implementation order

1. **Branch**: Create a new branch (e.g. `cursor/gui-design`) from current `cursor/builder-dashboard` or `main` — **you do this when you start implementation** (plan mode does not run git commands).
2. **TailwindCSS**: Install (`tailwindcss`, `postcss`, `autoprefixer`), run `npx tailwindcss init -p`, set `content` in `tailwind.config.js` to include `main/**/*.vue` and `index.html` (see [tailwindcss](docs/rpgjs-reference/docs/guide/tailwindcss.md)), and add `@tailwind base;` / `@tailwind components;` / `@tailwind utilities;` to the project’s main CSS (create or use existing global CSS entry so the client build includes it). Verify `rpgjs build` succeeds.
3. **Theme**: Add [theme.scss](theme.scss) at project root with the RPGJS window/cursor variables and, if desired, a webfont. Verify SCSS still compiles.
4. **Builder-dashboard styling**: Edit [main/gui/builder-dashboard.vue](main/gui/builder-dashboard.vue) — use **Tailwind utility classes** for typography, panel, tabs, list items, buttons, and place-mode HUD; keep scoped SCSS only where needed (e.g. theme vars). **Align with official API:** use `v-propagate` on the place-mode overlay div (remove the custom `onPlaceModeMapClick` / `propagateEvent` handler).
5. **Check**: Run `rpgjs build` and `npx tsc --noEmit`; test in-game (open builder, switch categories, select item, place on map, cancel).

---

## Files to touch (summary)


| Action | Path                                                                                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add    | `tailwind.config.js`, `postcss.config.js` — Tailwind + PostCSS config; content includes `main/**/*.vue`, `index.html`                                                |
| Add    | Main CSS file (e.g. `main/style.css` or root `style.css`) with `@tailwind base;` / `@tailwind components;` / `@tailwind utilities;` — ensure client build imports it |
| Add    | [theme.scss](theme.scss) (or `src/config/client/theme.scss`) — project-wide GUI theme for rpg-window                                                                 |
| Edit   | [main/gui/builder-dashboard.vue](main/gui/builder-dashboard.vue) — Tailwind utility classes + v-propagate; minimal scoped SCSS where needed                          |
| Edit   | `package.json` — devDependencies for tailwindcss, postcss, autoprefixer                                                                                              |


No changes to `main/player.ts`, agent code, or rpg.toml are required for design-only improvements. If the RPGJS client entry does not currently import a global CSS file, the build pipeline may need one additional import (e.g. in client entry or index.html) so Tailwind’s output is included.

---

## References

- RPGJS theme variables and path order: [docs/rpgjs-reference/docs/gui/theme.md](docs/rpgjs-reference/docs/gui/theme.md)
- Theme injection logic: [docs/rpgjs-reference/packages/compiler/src/build/vite-plugin-css.ts](docs/rpgjs-reference/packages/compiler/src/build/vite-plugin-css.ts)
- Default window styles: [docs/rpgjs-reference/packages/plugins/default-gui/src/window/window.vue](docs/rpgjs-reference/packages/plugins/default-gui/src/window/window.vue)
- Builder dashboard spec: [.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md](.cursor/plans/in-game_builder_dashboard_branch_b24d547b.plan.md)
- Tailwind integration: [docs/rpgjs-reference/docs/guide/tailwindcss.md](docs/rpgjs-reference/docs/guide/tailwindcss.md)

