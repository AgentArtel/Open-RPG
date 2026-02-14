# Phase 4 Documentation: Context Menus, Touch Support, Execution, and Toast

## Overview

Phase 4 introduces production-ready features for the Open Agent Artel workflow editor:

1. **Context Menu System** - Right-click menus for nodes, connections, and canvas
2. **Touch/Mobile Support** - Touch gestures for mobile and tablet devices
3. **Execution Visualization** - Workflow execution with progress tracking
4. **Toast Notifications** - User feedback system for actions and events

---

## Architecture

### File Structure

```
src/
├── hooks/
│   ├── useContextMenu.ts        # Context menu state management
│   ├── useTouchSupport.ts       # Touch gesture handling
│   ├── useExecution.ts          # Workflow execution engine
│   └── useToast.ts              # Toast notification system
├── components/ui-custom/
│   ├── ContextMenu.tsx          # Context menu UI component
│   └── Toast.tsx                # Toast notification component
└── pages/
    └── WorkflowEditorPage.tsx   # Integrated with all Phase 4 features
```

---

## 1. Context Menu System (`useContextMenu.ts`)

### Purpose
Manages right-click context menus with proper positioning and interaction handling.

### Features
- Multiple menu types (node, connection, canvas)
- Viewport boundary detection
- Click-outside to close
- Escape key to close
- Scroll to close

### API

```typescript
const {
  menuState,        // { isOpen, type, targetId }
  position,         // { x, y }
  openMenu,         // (type, x, y, targetId?) => void
  closeMenu,        // () => void
  isMenuOpen,       // (type) => boolean
} = useContextMenu(options);
```

### Usage Example

```tsx
const { menuState, position, openMenu, closeMenu } = useContextMenu();

// Open node context menu
const handleNodeRightClick = (e, nodeId) => {
  e.preventDefault();
  openMenu('node', e.clientX, e.clientY, nodeId);
};

// In JSX
{menuState.isOpen && (
  <ContextMenu
    position={position}
    items={getMenuItems(menuState.targetId)}
    onClose={closeMenu}
  />
)}
```

### Menu Item Structure

```typescript
interface MenuItem {
  id: string;
  label: string;
  type?: 'item' | 'divider' | 'submenu';
  icon?: React.ReactNode;
  disabled?: boolean;
  shortcut?: string;
  onClick?: () => void;
}
```

---

## 2. Touch Support (`useTouchSupport.ts`)

### Purpose
Provides touch gesture support for mobile and tablet devices.

### Gesture Mapping

| Mouse Action      | Touch Equivalent |
|-------------------|------------------|
| Click             | Tap              |
| Double click      | Double tap       |
| Right click       | Long press       |
| Drag              | Touch drag       |
| Wheel zoom        | Pinch            |
| Middle drag pan   | Two-finger pan   |

### API

```typescript
const {
  touchState,       // { touchCount, gesture, isTouching, ... }
  isTouchDevice,    // boolean
  touchHandlers,    // { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }
  resetTouchState,  // () => void
} = useTouchSupport(options);
```

### Options

```typescript
interface UseTouchSupportOptions {
  onTap?: (x, y, target) => void;
  onDoubleTap?: (x, y, target) => void;
  onLongPress?: (x, y, target) => void;
  onPinch?: (scale, centerX, centerY) => void;
  onPan?: (deltaX, deltaY) => void;
  longPressDuration?: number;  // default: 500ms
  doubleTapInterval?: number;  // default: 300ms
  enabled?: boolean;
}
```

### Usage Example

```tsx
const { touchHandlers, isTouchDevice } = useTouchSupport({
  onLongPress: (x, y, target) => {
    // Show context menu on long press
    openMenu('canvas', x, y);
  },
  onDoubleTap: () => {
    // Open config panel on double tap
    setIsConfigPanelOpen(true);
  },
});

// Apply to element
<div {...touchHandlers}>
  {/* Touchable content */}
</div>
```

---

## 3. Execution System (`useExecution.ts`)

### Purpose
Manages workflow execution with progress tracking and node status updates.

### Features
- Start/stop/pause/resume execution
- Node status tracking (waiting, running, success, error, skipped)
- Progress percentage calculation
- Execution logs
- Execution history
- Topological execution order

### API

```typescript
const {
  executionState,     // 'idle' | 'running' | 'paused' | 'completed' | 'error'
  nodeStatuses,       // Record<nodeId, status>
  progress,           // 0-100
  logs,               // ExecutionLog[]
  isExecuting,        // boolean
  canExecute,         // boolean
  executionHistory,   // ExecutionResult[]
  startExecution,     // () => void
  stopExecution,      // () => void
  pauseExecution,     // () => void
  resumeExecution,    // () => void
  resetExecution,     // () => void
  getNodeStatus,      // (nodeId) => status
  setNodeStatus,      // (nodeId, status) => void
  clearHistory,       // () => void
} = useExecution(options);
```

### Options

```typescript
interface UseExecutionOptions {
  nodes: NodeData[];
  connections: Connection[];
  onExecutionStart?: () => void;
  onExecutionComplete?: (result: ExecutionResult) => void;
  onExecutionError?: (error: string) => void;
  onNodeStatusChange?: (nodeId, status) => void;
}
```

### Usage Example

```tsx
const {
  executionState,
  progress,
  isExecuting,
  startExecution,
  stopExecution,
  getNodeStatus,
} = useExecution({
  nodes,
  connections,
  onExecutionStart: () => showInfo('Execution started'),
  onExecutionComplete: (result) => {
    showSuccess(`Completed in ${result.duration}ms`);
  },
  onExecutionError: (error) => showError(error),
});

// Start execution
startExecution();

// Get node status for rendering
const status = getNodeStatus(node.id);
```

### Execution Flow

1. **Start**: Build execution order (topological sort)
2. **Initialize**: Set all nodes to 'waiting'
3. **Execute**: Process nodes in dependency order
4. **Update**: Set node status as they complete
5. **Complete**: Store result in history

---

## 4. Toast System (`useToast.ts`)

### Purpose
Non-intrusive notification system for user feedback.

### Features
- Multiple toast types (success, error, warning, info)
- Auto-dismiss with configurable duration
- Manual dismiss
- Toast queue management
- Action buttons in toasts
- Progress bar animation

### API

```typescript
const {
  toasts,           // Toast[]
  toast,            // (type, message, options?) => id
  success,          // (message, options?) => id
  error,            // (message, options?) => id
  warning,          // (message, options?) => id
  info,             // (message, options?) => id
  dismiss,          // (id) => void
  dismissAll,       // () => void
} = useToast(options);
```

### Options

```typescript
interface UseToastOptions {
  defaultDuration?: number;  // default: 5000ms
  maxToasts?: number;        // default: 5
}

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}
```

### Usage Example

```tsx
const { success, error, info, toasts, dismiss } = useToast();

// Show success toast
success('Workflow saved', { duration: 3000 });

// Show error toast with action
error('Failed to save', {
  action: { label: 'Retry', onClick: () => retrySave() },
});

// Render toasts
<ToastContainer toasts={toasts} onDismiss={dismiss} position="bottom-right" />
```

---

## Integration in WorkflowEditorPage

### Phase 4 Features Integration

```tsx
// Context Menu
const { menuState, position, openMenu, closeMenu } = useContextMenu();

// Toast
const { toasts, success, error, info, dismiss } = useToast();

// Execution
const { progress, isExecuting, startExecution, stopExecution, getNodeStatus } = useExecution({
  nodes,
  connections,
  onExecutionStart: () => info('Execution started'),
  onExecutionComplete: (result) => success(`Completed in ${result.duration}ms`),
  onExecutionError: (err) => error(err),
});

// Touch Support
const { touchHandlers, isTouchDevice } = useTouchSupport({
  onLongPress: (x, y, target) => {
    // Show context menu on long press
    const nodeEl = (target as HTMLElement)?.closest('[data-node-id]');
    if (nodeEl) {
      const nodeId = nodeEl.getAttribute('data-node-id');
      openMenu('node', x, y, nodeId);
    } else {
      openMenu('canvas', x, y);
    }
  },
});
```

### Context Menu Items

```tsx
const getNodeMenuItems = (nodeId: string) => [
  {
    id: 'configure',
    label: 'Configure',
    icon: <Settings className="w-4 h-4" />,
    onClick: () => setIsConfigPanelOpen(true),
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: <Copy className="w-4 h-4" />,
    shortcut: 'Ctrl+D',
    onClick: () => duplicateNode(nodeId),
  },
  MenuPresets.divider('div-1'),
  {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    shortcut: 'Del',
    onClick: () => deleteNode(nodeId),
  },
];
```

---

## UI Components

### ContextMenu Component

```tsx
<ContextMenu
  position={{ x: 100, y: 200 }}
  items={menuItems}
  onClose={closeMenu}
/>
```

**Features:**
- Keyboard navigation (arrow keys, Enter, Escape)
- Hover states
- Disabled items
- Dividers
- Icons and shortcuts
- Auto-positioning within viewport

### ToastContainer Component

```tsx
<ToastContainer
  toasts={toasts}
  onDismiss={dismiss}
  position="bottom-right"
/>
```

**Positions:**
- `top-left`
- `top-right`
- `top-center`
- `bottom-left`
- `bottom-right`
- `bottom-center`

---

## Testing Checklist

### Context Menu
- [ ] Right-click on node shows node menu
- [ ] Right-click on canvas shows canvas menu
- [ ] Menu closes on click outside
- [ ] Menu closes on Escape key
- [ ] Menu items are clickable
- [ ] Menu positions correctly near viewport edges

### Touch Support
- [ ] Tap selects node
- [ ] Double tap opens config panel
- [ ] Long press shows context menu
- [ ] Pinch zooms canvas
- [ ] Two-finger pan moves canvas
- [ ] Touch indicator shows on touch devices

### Execution
- [ ] Start execution button works
- [ ] Progress bar updates during execution
- [ ] Node status indicators change
- [ ] Stop button stops execution
- [ ] Execution completes successfully
- [ ] Execution history is saved

### Toast
- [ ] Success toast shows on save
- [ ] Error toast shows on error
- [ ] Toast auto-dismisses
- [ ] Toast closes on X click
- [ ] Progress bar animates
- [ ] Multiple toasts stack correctly

---

## Future Enhancements

### Context Menu
- [ ] Submenu support
- [ ] Icons from icon library
- [ ] Custom menu item rendering

### Touch Support
- [ ] Swipe gestures
- [ ] Multi-touch rotation
- [ ] Haptic feedback

### Execution
- [ ] Real execution (not simulated)
- [ ] Parallel execution
- [ ] Conditional branching
- [ ] Loop support

### Toast
- [ ] Rich content toasts
- [ ] Persistent toasts
- [ ] Toast grouping

---

*Last Updated: Phase 4 Implementation*
*Version: 4.0.0*
