## TASK-004: Initialize Lovable dashboard project

- **Status**: PENDING
- **Assigned**: lovable
- **Priority**: P1-High
- **Type**: Create
- **Depends on**: none
- **Blocks**: none

### Context

The `frontend-lovable/` directory currently contains only a README placeholder.
We need a Lovable-generated React project as the foundation for the ClawLens
web dashboard.

### Objective

A working React + TypeScript + Tailwind project in `frontend-lovable/` with
Supabase client configured, basic routing, and the shadcn/ui design system
installed. `npm run build` must pass.

### Specifications

Create a new Lovable project with the following:

1. **Tech stack**: Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui
2. **Routing**: React Router with these initial routes:
   - `/` — Dashboard home (placeholder)
   - `/agents` — Agent management (placeholder)
   - `/glasses` — Glasses configuration (placeholder)
   - `/monitor` — Live monitor (placeholder)
3. **Supabase**: Install `@supabase/supabase-js`, create client stub
   that reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from env
4. **Design system**: shadcn/ui installed with a few base components
   (Button, Card, Input, Tabs)
5. **Layout**: Basic sidebar navigation with links to each route
6. **Dark mode**: Tailwind `dark:` prefix support configured

### Acceptance Criteria

- [ ] `npm install` succeeds
- [ ] `npm run build` passes
- [ ] `npm run dev` starts dev server
- [ ] All four routes render placeholder pages
- [ ] Sidebar navigation works
- [ ] shadcn/ui components are available
- [ ] Supabase client file exists (even if not yet connected)
- [ ] Dark mode toggle works

### Do NOT

- Add business logic, hooks, or services (Cursor's domain)
- Connect to a real Supabase instance yet
- Install additional UI libraries beyond shadcn/ui
- Create agent management or agent studio components (logic-heavy, Cursor's domain)
- Modify files outside `frontend-lovable/`

### Handoff Notes

_Updated by assigned agent when status changes._
