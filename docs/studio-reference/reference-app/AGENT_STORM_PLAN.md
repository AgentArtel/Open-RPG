# Open Agent Artel — Agent Storm Execution Plan

## Design System (MUST FOLLOW)

### Colors
- `--bg-primary`: #0A0A0A (app background)
- `--bg-secondary`: #141414 (card/panel backgrounds)
- `--bg-elevated`: #1A1A1A (modals, dropdowns)
- `--surface-node`: #1E1E1E (node cards)
- `--gradient-green-start`: #3D943D
- `--gradient-green-end`: #0C3F09
- `--accent-green`: #79F181 (highlights, active states)
- `--text-primary`: #D1D1D1
- `--text-secondary`: #8A8A8A
- `--border-default`: #2A2A2A
- `--border-glow`: rgba(121, 241, 129, 0.3)
- `--danger`: #E54D4D
- `--warning`: #F5A623

### Typography
- Font: Urbanist (Google Fonts)
- Mono: JetBrains Mono
- H1: 700, 28px
- H2: 600, 20px
- Body: 400, 14px
- Label: 500, 12px

### Effects
- Green glow: box-shadow with rgba(121, 241, 129, 0.3)
- Glass: backdrop-filter: blur(20px)
- Grid: radial-gradient dots at 16px spacing
- Border radius: 12px cards, 8px buttons, 16px modals

### Animation Easings
- `--ease-out-expo`: cubic-bezier(0.16, 1, 0.3, 1)
- `--ease-spring`: cubic-bezier(0.34, 1.56, 0.64, 1)

---

## Agent Assignments

### Agent 1: Dashboard & Analytics
**Files to create:**
- `/mnt/okcomputer/output/app/src/pages/Dashboard.tsx`
- `/mnt/okcomputer/output/app/src/components/dashboard/StatCard.tsx`
- `/mnt/okcomputer/output/app/src/components/dashboard/ActivityFeed.tsx`
- `/mnt/okcomputer/output/app/src/components/dashboard/WorkflowPreview.tsx`
- `/mnt/okcomputer/output/app/src/components/dashboard/ExecutionChart.tsx`

**Features:**
- Welcome header with user greeting
- Stats row (active workflows, executions today, success rate, avg duration)
- Recent workflows grid with status badges
- Activity feed with timestamps
- Execution trend chart (mini sparkline)
- Quick actions (Create workflow, Browse templates)

---

### Agent 2: Workflow List & Management
**Files to create:**
- `/mnt/okcomputer/output/app/src/pages/WorkflowList.tsx`
- `/mnt/okcomputer/output/app/src/components/workflow/WorkflowCard.tsx`
- `/mnt/okcomputer/output/app/src/components/workflow/WorkflowGrid.tsx`
- `/mnt/okcomputer/output/app/src/components/workflow/WorkflowFilters.tsx`
- `/mnt/okcomputer/output/app/src/components/workflow/SearchBar.tsx`

**Features:**
- Toggle between grid/list view
- Search with real-time filtering
- Filter by status (Active, Inactive, Error)
- Sort by name, last run, created date
- Workflow cards with mini canvas preview
- Bulk actions (Delete, Activate, Deactivate)
- Empty state illustration

---

### Agent 3: Execution History & Detail
**Files to create:**
- `/mnt/okcomputer/output/app/src/pages/ExecutionHistory.tsx`
- `/mnt/okcomputer/output/app/src/pages/ExecutionDetail.tsx`
- `/mnt/okcomputer/output/app/src/components/execution/ExecutionRow.tsx`
- `/mnt/okcomputer/output/app/src/components/execution/ExecutionTimeline.tsx`
- `/mnt/okcomputer/output/app/src/components/execution/NodeExecutionStatus.tsx`

**Features:**
- Execution list with status, duration, timestamp
- Filter by status (Success, Failed, Running)
- Execution detail view with node-by-node status
- Timeline visualization
- Log viewer with syntax highlighting
- Retry execution button
- Download logs button

---

### Agent 4: Credentials Manager & Settings
**Files to create:**
- `/mnt/okcomputer/output/app/src/pages/Credentials.tsx`
- `/mnt/okcomputer/output/app/src/pages/Settings.tsx`
- `/mnt/okcomputer/output/app/src/components/credentials/CredentialCard.tsx`
- `/mnt/okcomputer/output/app/src/components/credentials/AddCredentialModal.tsx`
- `/mnt/okcomputer/output/app/src/components/settings/SettingsSection.tsx`

**Features:**
- Credentials list with service icons
- Masked API keys with reveal toggle
- Last used timestamp
- Add/edit credential modal
- Settings sections (Account, Notifications, API Keys, Team)
- Toggle switches for preferences

---

### Agent 5: Additional Node Types
**Files to create:**
- `/mnt/okcomputer/output/app/src/components/nodes/HTTPRequestNode.tsx`
- `/mnt/okcomputer/output/app/src/components/nodes/CodeNode.tsx`
- `/mnt/okcomputer/output/app/src/components/nodes/WebhookNode.tsx`
- `/mnt/okcomputer/output/app/src/components/nodes/ScheduleNode.tsx`
- `/mnt/okcomputer/output/app/src/components/nodes/IfNode.tsx`
- `/mnt/okcomputer/output/app/src/components/nodes/MergeNode.tsx`

**Features:**
- HTTP Request node with method, URL, headers
- Code node with language selector (JavaScript, Python)
- Webhook node with URL display
- Schedule node with cron expression
- If/Else conditional node
- Merge node for combining data

---

### Agent 6: Form Components Library
**Files to create:**
- `/mnt/okcomputer/output/app/src/components/ui-custom/FormInput.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/FormSelect.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/FormTextarea.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/FormToggle.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/FormSlider.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/FormCheckbox.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/FormRadio.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/FormTags.tsx`

**Features:**
- Dark themed inputs with green focus states
- Dropdown selects with search
- Sliders with value display
- Toggle switches with smooth animation
- Tag input for arrays
- Validation states (error, success)

---

### Agent 7: Data Display Components
**Files to create:**
- `/mnt/okcomputer/output/app/src/components/ui-custom/DataTable.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/StatusBadge.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/ProgressBar.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/ProgressRing.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/Avatar.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/AvatarGroup.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/Chip.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/EmptyState.tsx`

**Features:**
- Sortable table with hover states
- Status badges (Active, Inactive, Error, Running)
- Progress bars and rings
- Avatar with fallback initials
- Chip/pill components
- Empty state with illustration

---

### Agent 8: Navigation & Layout Components
**Files to create:**
- `/mnt/okcomputer/output/app/src/components/ui-custom/Sidebar.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/SidebarItem.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/TopNavigation.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/Breadcrumb.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/TabBar.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/PageHeader.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/BottomTabBar.tsx`

**Features:**
- Collapsible sidebar with icons
- Active state with green indicator
- Breadcrumb navigation
- Tab bars with animated underline
- Mobile bottom navigation

---

### Agent 9: Feedback & Overlay Components
**Files to create:**
- `/mnt/okcomputer/output/app/src/components/ui-custom/Modal.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/Drawer.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/Toast.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/Tooltip.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/Popover.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/Alert.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/ConfirmDialog.tsx`
- `/mnt/okcomputer/output/app/src/components/ui-custom/LoadingSpinner.tsx`

**Features:**
- Modal with backdrop blur
- Slide-in drawers
- Toast notifications with auto-dismiss
- Tooltips on hover
- Alert banners
- Confirm dialogs for destructive actions
- Loading spinners (dots, ring, pulse)

---

### Agent 10: Agent Library & Templates
**Files to create:**
- `/mnt/okcomputer/output/app/src/pages/AgentLibrary.tsx`
- `/mnt/okcomputer/output/app/src/components/templates/TemplateCard.tsx`
- `/mnt/okcomputer/output/app/src/components/templates/TemplateCategory.tsx`
- `/mnt/okcomputer/output/app/src/components/templates/TemplateDetailModal.tsx`

**Features:**
- Template categories (Marketing, Sales, Support, DevOps)
- Template cards with preview image
- Difficulty badge (Beginner, Intermediate, Advanced)
- Use template button
- Template detail view with description
- Import workflow button

---

## File Structure
```
src/
├── components/
│   ├── nodes/           # All node types
│   ├── ui-custom/       # Reusable UI components
│   ├── dashboard/       # Dashboard-specific
│   ├── workflow/        # Workflow list components
│   ├── execution/       # Execution components
│   ├── credentials/     # Credential components
│   ├── settings/        # Settings components
│   └── templates/       # Template components
├── pages/               # Full page components
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
└── lib/                 # Utility functions
```

## Common Patterns

### Component Template
```tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  // ... other props
}

export const Component: React.FC<ComponentProps> = ({ 
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        "bg-dark-100 border border-white/5 rounded-xl",
        className
      )}
      {...props}
    >
      {/* Content */}
    </div>
  );
};
```

### Animation Pattern
```tsx
style={{
  animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
}}
```

### Green Glow
```tsx
className="shadow-glow hover:shadow-glow-strong transition-shadow"
```
