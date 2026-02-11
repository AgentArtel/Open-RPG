# Landing Page Redesign Plan

*(Preserved from Lovable/merge backup so the spec is not lost.)*

## Problem Analysis

The current landing page uses:
- Light generic styling with `bg-secondary/30`, `bg-card`, `rounded-2xl`, `rounded-full`
- `font-serif` for headings (should be Noto Sans JP, not serif)
- Generic muted colors (`text-muted-foreground`, `bg-foreground`)
- No Japanese text labels
- No HUD animations or glow effects
- No `.hud-card`, `.btn-cyan`, `.badge-cyan` classes
- Generic rounded-2xl corners (should be `rounded-sm` per design system)

**Target:** Dark HUD aesthetic with cyan-on-charcoal, Japanese labels, corner accents, and technical precision.

---

## Design Changes

### Color Scheme
| Current | Target |
|---------|--------|
| Light gray backgrounds | Charcoal `#12141A` background |
| Generic borders | Cyan-glowing borders |
| `text-foreground` | `text-offwhite` |
| `text-muted-foreground` | `text-gray` |
| `bg-secondary/30` | `bg-charcoal-light/80` with backdrop-blur |

### Typography
| Element | Current | Target |
|---------|---------|--------|
| Headings | `font-serif` | Noto Sans JP (default), `tracking-wider` |
| Body | Generic | `text-sm tracking-wide` |
| Labels | None | Japanese subtitles in `text-[10px] text-gray tracking-widest` |
| Data | Regular | JetBrains Mono (`font-mono text-cyan`) |

### Components
- Hero badge: Replace generic rounded-full with `.badge-cyan`
- Buttons: Replace rounded-full with `.btn-cyan` and `.btn-outline`
- Cards: Replace generic cards with `.hud-card .corner-accent`
- Status dots: Add `.animate-pulse-cyan` with cyan glow shadows
- Tier rows: Add HUD styling with cyan accents and font-mono values

---

## Section-by-Section Updates

### 1. Header
- Dark backdrop with charcoal background and cyan border
- Logo with cyan glow: `<Glasses className="text-cyan" />`
- Nav links: `text-gray hover:text-cyan`
- Buttons: `btn-outline` for Sign In, `btn-cyan` for Get Started
- Add corner accent decoration

### 2. Hero Section
- Full dark background
- Badge: `.badge-cyan` with pulsing status indicator
- Heading: Uppercase tracking-wider, cyan accent on key phrase
- Japanese subtitle: `AIエージェント // ON YOUR FACE`
- G1 Display Preview:
  - Use `.g1-hud` class with corner accents
  - Cyan text on black background
  - Processing indicator with typing animation
  - Page indicator dots at bottom

### 3. Features Section
- Page header with `.section-title` underline and Japanese label: `機能 // FEATURES`
- 2x3 grid of `.hud-card .corner-accent` cards
- Icon containers: `bg-cyan/10 border border-cyan/20`
- Icons: `text-cyan strokeWidth={1.5}`
- Subtle hover glow effect

### 4. Architecture Section (Three-Tier)
- Header: `三層アーキテクチャ // THREE-TIER ARCHITECTURE`
- Tier cards with `.hud-card` styling
- Color-coded tier labels in `font-mono`:
  - Tier 1 (Edge): `text-cyan`
  - Tier 2 (Local): `text-yellow-500` (warning)
  - Tier 3 (Cloud): `text-vermillion`
- Latency and model info in `font-mono text-gray`
- Visual connection lines between tiers (optional enhancement)

### 5. Agents Section
- Header: `エージェント // YOUR AGENT TEAM`
- 2x2 grid of agent preview cards
- Agent cards with `.hud-card` styling
- Status badges with `.badge-cyan`
- Skill tags: `bg-charcoal-lighter text-gray`

### 6. CTA Section
- Dark HUD card with cyan border glow
- Centered call-to-action
- Primary `.btn-cyan` button
- Japanese subtitle

### 7. Footer
- Dark with charcoal-lighter border top
- Cyan logo accent
- Japanese text: `OpenClawで構築`

---

## Animations

Add these from the Animation Guide:
- `.animate-fade-in` on page load (already in CSS)
- `.animate-pulse-cyan` on status indicators
- Card hover: `hover:border-cyan/30` with glow effect
- Staggered card entry with `animationDelay`
- G1 display typing cursor animation

---

## Technical Implementation

### Files to Modify

1. **`src/pages/Landing.tsx`** (complete rewrite)
   - Apply dark HUD styling throughout
   - Add Japanese labels to all section headers
   - Implement `.hud-card`, `.btn-cyan`, `.corner-accent` classes
   - Add G1 display simulator in hero with typing animation
   - Use proper icon strokeWidth={1.5}
   - Add staggered animations

2. **`src/pages/Auth.tsx`** (update to match)
   - Update right panel to use `.g1-hud` styling
   - Apply dark theme to form panel
   - Use `.btn-cyan` for submit button
   - Add Japanese labels

3. **`src/index.css`** (add missing animations if needed)
   - Verify `.animate-fade-in` keyframes exist
   - Add staggered animation utilities

---

## Component Structure

```text
Landing Page
+-- Header
    +-- Logo (cyan glow)
    +-- Nav links (gray hover:cyan)
    +-- Auth buttons (btn-outline, btn-cyan)
+-- Hero
    +-- Status badge (badge-cyan + pulse)
    +-- Heading (uppercase, cyan accent)
    +-- Japanese subtitle
    +-- CTA buttons
    +-- G1 Display Preview (g1-hud)
+-- Features (section-title with underline)
    +-- 6x hud-card with corner-accent
+-- Architecture (three-tier visualization)
    +-- 3x tier row cards
+-- Agents (agent preview cards)
    +-- 4x hud-card agent cards
+-- CTA (final call-to-action)
+-- Footer
```

---

## Acceptance Criteria

- All backgrounds use charcoal palette (#12141A, #1A1D26, #2A2E3D)
- Primary accent is cyan (#00D4AA) with glow effects
- All headings use Noto Sans JP with tracking-wider
- Every section has Japanese subtitle labels
- Cards use `.hud-card` and `.corner-accent` classes
- Buttons use `.btn-cyan` and `.btn-outline` classes
- Icons use `strokeWidth={1.5}` consistently
- G1 display preview uses `.g1-hud` with corner brackets
- Status indicators pulse with cyan glow
- Smooth fade-in animation on page load
- Responsive on mobile (single column layout)
