## TASK-009: Redesign dashboard to match Kimi K2 dark HUD aesthetic

- **Status**: PENDING
- **Assigned**: lovable
- **Priority**: P0-Critical
- **Type**: Redesign
- **Depends on**: TASK-004
- **Blocks**: none

### Context

The v1 dashboard (`frontend-lovable/clawlens-companion/`) uses a light theme.
We have a design reference from Kimi K2 at `frontend-lovable/v2-replace-v1/Kimi_Agent_ClawLens Design Inspiration/`
that implements a **dark HUD aesthetic** matching the Even G1 glasses display.

**This is a carbon-copy redesign.** Match the Kimi reference app as closely as
possible — same layout, same color system, same HUD aesthetic, same component
patterns. Then wire it up properly with React Router and clean structure.

### Design Reference Files

All reference code is in:
```
frontend-lovable/v2-replace-v1/Kimi_Agent_ClawLens%20Design%20Inspiration/
├── DESIGN_SYSTEM.md          # Color system, typography, spacing
├── COMPONENT_GUIDE.md        # Component patterns
├── ANIMATION_GUIDE.md        # Motion specs
├── app/                      # Complete React reference app
│   ├── src/App.tsx           # Sidebar + section routing
│   ├── src/index.css         # All CSS variables and custom classes
│   ├── tailwind.config.js    # Theme extensions
│   ├── src/components/Sidebar.tsx
│   ├── src/sections/LiveMonitor.tsx
│   ├── src/sections/AgentManagement.tsx
│   ├── src/sections/GlassesConfig.tsx
│   ├── src/sections/AgentStudio.tsx
│   ├── src/sections/ComputeTiers.tsx
│   └── src/types/index.ts
└── screenshot*.png           # Visual reference
```

### Objective

Replace the v1 light theme with the Kimi dark HUD design. The result should be
a functional React dashboard with the exact same visual appearance as the Kimi
reference app, but using React Router for navigation instead of state-based
section switching.

---

### 1. COLOR SYSTEM — Replace All CSS Variables

Replace `index.css` root variables with this exact dark theme:

```css
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Noto+Serif+JP:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --background: 220 15% 8%;
  --foreground: 0 0% 95%;
  --card: 220 15% 10%;
  --card-foreground: 0 0% 95%;
  --popover: 220 15% 10%;
  --popover-foreground: 0 0% 95%;
  --primary: 160 80% 45%;
  --primary-foreground: 220 15% 8%;
  --secondary: 220 10% 15%;
  --secondary-foreground: 0 0% 95%;
  --muted: 220 10% 18%;
  --muted-foreground: 220 10% 55%;
  --accent: 355 70% 55%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 60% 50%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 10% 18%;
  --input: 220 10% 18%;
  --ring: 160 80% 45%;
  --radius: 0.125rem;

  --sidebar-background: 220 15% 6%;
  --sidebar-foreground: 0 0% 90%;
  --sidebar-primary: 160 80% 45%;
  --sidebar-primary-foreground: 220 15% 8%;
  --sidebar-accent: 220 10% 12%;
  --sidebar-accent-foreground: 0 0% 90%;
  --sidebar-border: 220 10% 15%;
  --sidebar-ring: 160 80% 45%;

  --cyan: 160 80% 45%;
  --cyan-glow: 160 80% 45%;
  --vermillion: 355 70% 55%;
  --charcoal: 220 15% 8%;
  --charcoal-light: 220 10% 12%;
  --charcoal-lighter: 220 10% 18%;
  --offwhite: 0 0% 95%;
  --gray: 220 10% 45%;
}
```

### 2. CUSTOM CSS CLASSES — Add to index.css

```css
/* HUD Card */
.hud-card {
  @apply bg-charcoal-light/80 backdrop-blur border border-charcoal-lighter;
  box-shadow:
    0 0 0 1px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.03);
}

/* Cyan Glow */
.cyan-glow {
  text-shadow: 0 0 10px hsl(var(--cyan) / 0.5),
               0 0 20px hsl(var(--cyan) / 0.3);
}

.cyan-border-glow {
  box-shadow:
    0 0 0 1px hsl(var(--cyan) / 0.3),
    0 0 15px hsl(var(--cyan) / 0.15),
    inset 0 1px 0 rgba(255,255,255,0.03);
}

/* Section Title */
.section-title {
  @apply relative pb-3;
}
.section-title::after {
  content: '';
  @apply absolute bottom-0 left-0 w-16 h-[2px];
  background: linear-gradient(90deg, hsl(var(--cyan)) 0%, hsl(var(--cyan) / 0.3) 100%);
}

/* Buttons */
.btn-cyan {
  @apply bg-cyan text-charcoal px-5 py-2 text-sm font-medium tracking-wide;
  @apply hover:bg-cyan/90 transition-colors duration-200;
  box-shadow: 0 0 15px hsl(var(--cyan) / 0.3);
}

.btn-outline {
  @apply bg-transparent text-gray border border-charcoal-lighter px-5 py-2 text-sm font-medium tracking-wide;
  @apply hover:border-cyan/50 hover:text-cyan transition-colors duration-200;
}

/* Badges */
.badge-cyan {
  @apply bg-cyan/10 text-cyan px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase;
  border: 1px solid hsl(var(--cyan) / 0.3);
}

.badge-vermillion {
  @apply bg-vermillion/10 text-vermillion px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase;
  border: 1px solid hsl(var(--vermillion) / 0.3);
}

/* G1 Display Simulator */
.g1-hud {
  @apply bg-black rounded-sm p-6 relative overflow-hidden;
  box-shadow:
    inset 0 0 30px rgba(0,0,0,0.8),
    0 0 0 1px hsl(var(--cyan) / 0.2);
}
.g1-hud::before {
  content: '';
  @apply absolute inset-0;
  background: linear-gradient(180deg,
    hsl(var(--cyan) / 0.03) 0%,
    transparent 30%,
    transparent 70%,
    hsl(var(--cyan) / 0.03) 100%
  );
  pointer-events: none;
}

/* Grid Lines (HUD background) */
.grid-hud {
  background-image:
    linear-gradient(hsl(var(--cyan) / 0.03) 1px, transparent 1px),
    linear-gradient(90deg, hsl(var(--cyan) / 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Corner Accents */
.corner-accent {
  @apply relative;
}
.corner-accent::before,
.corner-accent::after {
  content: '';
  @apply absolute w-3 h-3 border-cyan/40;
}
.corner-accent::before {
  @apply top-0 left-0 border-t border-l;
}
.corner-accent::after {
  @apply bottom-0 right-0 border-b border-r;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: hsl(var(--charcoal)); }
::-webkit-scrollbar-thumb { background: hsl(var(--charcoal-lighter)); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--cyan) / 0.5); }
```

### 3. TAILWIND CONFIG — Update tailwind.config.ts

Add these color extensions and animations:

```ts
// Colors
cyan: {
  DEFAULT: "hsl(160, 80%, 45%)",
  light: "hsl(160, 80%, 55%)",
  dark: "hsl(160, 80%, 35%)",
},
vermillion: {
  DEFAULT: "hsl(355, 70%, 55%)",
  light: "hsl(355, 70%, 65%)",
  dark: "hsl(355, 70%, 45%)",
},
charcoal: {
  DEFAULT: "hsl(220, 15%, 8%)",
  light: "hsl(220, 10%, 12%)",
  lighter: "hsl(220, 10%, 18%)",
},
offwhite: "hsl(0, 0%, 95%)",
gray: "hsl(220, 10%, 45%)",

// Font families
fontFamily: {
  sans: ['Noto Sans JP', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
},

// Animations
keyframes: {
  "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
  "pulse-cyan": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
},
animation: {
  "fade-in": "fade-in 0.3s ease-out",
  "pulse-cyan": "pulse-cyan 2s ease-in-out infinite",
},

// Shadows
boxShadow: {
  hud: "0 0 0 1px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
  "cyan-glow": "0 0 15px hsl(160 80% 45% / 0.3)",
},
```

### 4. LAYOUT — Sidebar Navigation (replace top Header)

Replace the top `<Header>` with a left sidebar. Keep React Router but use
sidebar for navigation.

**App.tsx structure:**
```tsx
<div className="flex h-screen bg-charcoal text-offwhite overflow-hidden">
  <Sidebar />  {/* w-64, fixed left */}
  <main className="flex-1 overflow-auto grid-hud">
    <Routes>
      <Route path="/" element={<LiveMonitor />} />
      <Route path="/agents" element={<AgentManagement />} />
      <Route path="/glasses" element={<GlassesConfig />} />
      <Route path="/studio" element={<AgentStudio />} />
      <Route path="/compute" element={<ComputeTiers />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </main>
</div>
```

**Sidebar navigation items:**
| Route | Label | Japanese | Icon (Lucide) |
|-------|-------|----------|---------------|
| `/` | LIVE MONITOR | モニター | Activity |
| `/agents` | AGENTS | エージェント | Bot |
| `/glasses` | GLASSES | 設定 | Glasses |
| `/studio` | STUDIO | スタジオ | Code2 |
| `/compute` | COMPUTE | コンピュート | Cpu |

**Sidebar footer:** 3 status rows (Gateway, Glasses, WS) with pulsing cyan dots.

### 5. PAGES — Carbon-copy from Kimi reference

Copy the exact layout, component structure, and mock data from the Kimi reference
sections. See the reference files listed above for exact code.

**5 pages to implement:**

#### LiveMonitor (`/`)
- 4 status cards grid (Gateway, WebSocket, BLE Signal, Battery)
- G1 Display Simulator with corner accents, typing indicator, pagination
- Activity Feed with color-coded log types (voice, agent, system, gesture)
- Active Agents row
- Simulated live updates (useEffect, every 10s)

#### AgentManagement (`/agents`)
- Agent cards grid (2-col) with status indicators
- Click-to-select agent detail panel (3-col grid)
- Create Agent dialog
- Routing Rules card
- Agent toggles (status, notifications)

#### GlassesConfig (`/glasses`)
- Display Preferences: brightness slider, font size toggle (S/M/L), auto-scroll
- Notification Rules: quiet hours toggle with time inputs, urgency threshold table
- Gesture Mapping: 4-gesture grid (single/double/triple/long tap)
- Voice Commands: add form + command list grid

#### AgentStudio (`/studio`)
- Skill editor (name, category, description inputs)
- SKILL.md textarea editor (left) + Preview/Test tabs (right)
- G1 HUD display preview with pagination
- Test runner with simulated 2s delay
- ClawHub skill browser (ScrollArea)
- Template grid (4 templates)

#### ComputeTiers (`/compute`)
- Architecture diagram (Cloud → Local → Edge → Glasses flow)
- 3 tier detail cards with status, latency, load progress bar, models
- Capability matrix table (8 capabilities × 3 tiers)
- Edge Device Status (Galaxy S24 stats + routing options)
- Auto-routing toggle

### 6. TYPES — Use these TypeScript interfaces

```ts
export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'error' | 'offline';
  skills: string[];
  canPushNotifications: boolean;
  priority: number;
  lastActive: string;
  tier: 'edge' | 'local' | 'cloud';
}

export interface GlassesDisplay {
  currentText: string;
  pageNumber: number;
  totalPages: number;
  isTyping: boolean;
  brightness: number;
  fontSize: 'small' | 'medium' | 'large';
}

export interface ConnectionStatus {
  gateway: 'online' | 'offline' | 'connecting';
  glasses: 'connected' | 'disconnected' | 'connecting';
  websocket: 'open' | 'closed' | 'connecting';
  bleSignal: number;
  batteryLevel: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'voice' | 'agent' | 'system' | 'gesture';
  source: string;
  message: string;
  agentId?: string;
}

export interface GestureMapping {
  gesture: 'single' | 'double' | 'triple' | 'long';
  action: string;
  description: string;
}

export interface VoiceCommand {
  trigger: string;
  action: string;
  agentId?: string;
}

export interface ComputeTier {
  id: 'edge' | 'local' | 'cloud';
  name: string;
  status: 'active' | 'standby' | 'offline';
  latency: string;
  models: string[];
  currentLoad: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}
```

### 7. MOCK DATA

Use the same mock data from the Kimi reference sections. Key data points:

**Agents:** Personal Assistant (助手), Research Agent (研究), Code Agent (開発), Briefing Agent (概要)

**Tiers:**
- Tier 1: Galaxy S24 Edge — Gemma 2B, Whisper Tiny, 0.3-1s latency
- Tier 2: Mac Mini Server — Llama 3.1 70B, Mistral Large, 0.5-2s latency
- Tier 3: Cloud APIs — Kimi K2, Gemini 1.5 Pro, Claude 3.5, 1-5s latency

**Gestures:** single_tap→next_page, double_tap→dismiss, triple_tap→cycle_agent, long_press→new_query

### Acceptance Criteria

- [ ] Dark HUD theme matches the Kimi reference app screenshots
- [ ] Sidebar navigation with 5 routes and Japanese labels
- [ ] All 5 pages implemented with the Kimi layout/structure
- [ ] CSS variables, custom classes, and tailwind config match the spec above
- [ ] G1 Display Simulator with corner accents and cyan-on-black aesthetic
- [ ] Animations: fade-in on pages, pulse-cyan on status indicators
- [ ] Grid HUD background pattern on main content area
- [ ] Fonts: Noto Sans JP (UI) + JetBrains Mono (data/code)
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes

### Do NOT

- Remove or modify `components/ui/` (shadcn primitives) — restyle via CSS variables
- Add new npm dependencies beyond what's already in package.json (Lucide is already there)
- Change the project structure outside `frontend-lovable/clawlens-companion/`
- Connect to real APIs (use mock data for now)

### Implementation Approach

The fastest path is:
1. Update CSS variables and add custom classes in `index.css`
2. Update `tailwind.config.ts` with new colors/fonts/animations
3. Replace `Header` component with `Sidebar` component
4. Update `App.tsx` layout to sidebar + main
5. Rewrite each page to match the Kimi section layout
6. Add shared types file (`src/types/index.ts`)
7. Replace `lib/mock-data.ts` with Kimi's mock data structure

### Reference

The complete Kimi reference app source is at:
`frontend-lovable/v2-replace-v1/Kimi_Agent_ClawLens%20Design%20Inspiration/app/`

Copy code directly from the reference sections. The goal is visual parity.

### Handoff Notes

_Updated by assigned agent when status changes._
