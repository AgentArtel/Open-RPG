# Phase 2 Documentation: Selection, Keyboard Shortcuts, and Undo/Redo

## Overview

Phase 2 introduces three major systems to the Open Agent Artel workflow editor:

1. **Multi-Selection System** - Select multiple nodes/connections via Shift+click, Ctrl+click, and box selection
2. **Undo/Redo System** - Full history management with unlimited undo levels
3. **Keyboard Shortcuts** - Comprehensive keyboard shortcut system with platform-aware key handling

---

## Architecture

### File Structure

```
src/
├── hooks/
│   ├── useSelection.ts          # Multi-selection state management
│   ├── useUndoRedo.ts           # History stack for undo/redo
│   └── useKeyboardShortcuts.ts  # Centralized keyboard shortcut handling
├── components/canvas/
│   └── SelectionBox.tsx         # Visual feedback for box selection
└── pages/
    └── WorkflowEditorPage.tsx   # Integration of all Phase 2 features
```

---

## 1. Selection System (`useSelection.ts`)

### Purpose
Manages multi-selection state for nodes and connections with support for:
- Single click selection
- Shift+click toggle selection
- Ctrl/Cmd+click additive selection
- Box selection (drag to select)

### API

```typescript
const {
  selectedNodeIds,        // Set<string> - Currently selected node IDs
  selectedConnectionIds,  // Set<string> - Currently selected connection IDs
  selectionBox,           // SelectionBox - Current selection box state
  isNodeSelected,         // (id: string) => boolean
  isConnectionSelected,   // (id: string) => boolean
  handleNodeClick,        // (nodeId: string, event?) => void
  handleConnectionClick,  // (connectionId: string, event?) => void
  handleSelectionBoxStart,// (x: number, y: number) => void
  handleSelectionBoxMove, // (x: number, y: number) => void
  handleSelectionBoxEnd,  // (nodes, connections, isAdditive?) => void
  selectAll,              // (nodes, connections) => void
  clearSelection,         // () => void
} = useSelection(options);
```

### Selection Behavior

| Action | Result |
|--------|--------|
| Click | Select single item, deselect others |
| Shift+Click | Toggle item in selection |
| Ctrl/Cmd+Click | Add item to selection |
| Box Drag | Select all items in box |
| Shift+Box Drag | Add items in box to selection |

### Integration Example

```tsx
// In WorkflowEditorPage.tsx
const {
  selectedNodeIds,
  selectedConnectionIds,
  handleNodeClick,
  handleSelectionBoxEnd,
} = useSelection();

// Render nodes with selection state
{nodes.map(node => (
  <CanvasNode
    key={node.id}
    data={node}
    isSelected={selectedNodeIds.has(node.id)}
    onClick={(e) => handleNodeClick(node.id, e)}
  />
))}

// Render selection box
{selectionBox.isActive && (
  <SelectionBox
    startX={selectionBox.startX}
    startY={selectionBox.startY}
    currentX={selectionBox.currentX}
    currentY={selectionBox.currentY}
  />
)}
```

---

## 2. Undo/Redo System (`useUndoRedo.ts`)

### Purpose
Implements a complete undo/redo system using the Command pattern with a history stack.

### Architecture

```
History Stack (Array)
├── Index 0: Initial State
├── Index 1: After Action 1
├── Index 2: After Action 2
├── Index 3: Current State ← currentIndex
└── Index 4: Future State (will be discarded on new action)
```

### State Snapshot Strategy

- Stores complete state snapshots (nodes + connections)
- Each snapshot includes:
  - `nodes`: NodeData[]
  - `connections`: Connection[]
  - `timestamp`: number
  - `action`: string (description for debugging)

### API

```typescript
const {
  state,           // Current workflow state
  nodes,           // Current nodes (convenience)
  connections,     // Current connections (convenience)
  history,         // Full history array
  currentIndex,    // Current position in history
  canUndo,         // boolean - Can we undo?
  canRedo,         // boolean - Can we redo?
  pushState,       // (state, action?) => void
  undo,            // () => void
  redo,            // () => void
  reset,           // (initialState?) => void
} = useUndoRedo(options);
```

### When to Push State

Push to history after these user actions:
- Adding a node
- Deleting node(s)/connection(s)
- Moving a node (on drag end, not during)
- Creating a connection
- Updating node configuration

```typescript
// Example: Push state after adding a node
const handleAddNode = (nodeType: NodeType) => {
  const newNode = createNode(nodeType);
  pushState(
    { nodes: [...nodes, newNode], connections },
    'add-node'  // Action description for debugging
  );
};
```

### Integration Example

```tsx
// In WorkflowEditorPage.tsx
const {
  nodes,
  connections,
  pushState,
  undo,
  redo,
  canUndo,
  canRedo,
} = useUndoRedo({
  initialState: { nodes: initialNodes, connections: initialConnections },
  maxHistory: 50,  // Keep last 50 actions
});

// Pass undo/redo to Header for toolbar buttons
<Header
  canUndo={canUndo}
  canRedo={canRedo}
  onUndo={undo}
  onRedo={redo}
/>
```

---

## 3. Keyboard Shortcuts (`useKeyboardShortcuts.ts`)

### Purpose
Centralized keyboard shortcut management with:
- Automatic cleanup on unmount
- Conflict detection
- Platform-aware key handling (Mac vs Windows)
- Input field detection (shortcuts disabled when typing)

### Supported Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + Y | Redo (alternative) |
| Delete / Backspace | Delete selected |
| Ctrl/Cmd + A | Select all |
| Escape | Clear selection, close panels |
| Ctrl/Cmd + S | Save workflow |

### API

```typescript
const {
  registerShortcut,    // (config) => unregister
  registerShortcuts,   // (configs[]) => unregister
  unregisterShortcut,  // (config) => void
  getRegisteredShortcuts, // () => ShortcutConfig[]
  formatShortcut,      // (key, modifiers) => display string
} = useKeyboardShortcuts();
```

### Shortcut Config

```typescript
interface ShortcutConfig {
  key: string;                    // Key to listen for
  modifiers?: ModifierKey[];      // ['ctrl', 'shift', 'alt', 'meta']
  handler: (event) => void | boolean;
  description?: string;           // For help/documentation
  preventDefault?: boolean;       // Prevent browser default
  stopPropagation?: boolean;      // Stop event bubbling
  priority?: number;              // Higher = handled first
  when?: () => boolean;           // Condition function
}
```

### Integration Example

```tsx
// In WorkflowEditorPage.tsx
const { registerShortcuts } = useKeyboardShortcuts();

useEffect(() => {
  return registerShortcuts([
    {
      key: 'z',
      modifiers: ['ctrl'],
      handler: () => {
        if (canUndo) {
          undo();
          return true; // Prevent default
        }
        return false;
      },
      description: 'Undo last action',
    },
    {
      key: 'Delete',
      handler: () => {
        handleDeleteSelected();
        return true;
      },
      description: 'Delete selected items',
    },
  ]);
}, [canUndo, undo, handleDeleteSelected]);
```

---

## 4. Selection Box Component (`SelectionBox.tsx`)

### Purpose
Visual feedback during drag-to-select operation.

### Props

```typescript
interface SelectionBoxProps {
  startX: number;    // Starting X (canvas coordinates)
  startY: number;    // Starting Y (canvas coordinates)
  currentX: number;  // Current X (canvas coordinates)
  currentY: number;  // Current Y (canvas coordinates)
}
```

### Visual Design
- Semi-transparent green fill
- Dashed border
- Corner indicators
- Size indicator (for large selections)

### Usage

```tsx
{selectionBox.isActive && (
  <SelectionBox
    startX={selectionBox.startX}
    startY={selectionBox.startY}
    currentX={selectionBox.currentX}
    currentY={selectionBox.currentY}
  />
)}
```

---

## Integration in WorkflowEditorPage

### State Flow

```
User Action → Update State → Push to History → Re-render
     ↑                                          ↓
     └────────── Undo/Redo ←────────────────────┘
```

### Event Handling Flow

```
Canvas Mouse Down
├── On Node → startNodeDrag
├── On Port → startConnection
└── On Background → handleSelectionBoxStart

Canvas Mouse Move
├── Dragging → handleDragMouseMove
├── Connecting → handleConnectionMouseMove
└── Box Select → handleSelectionBoxMove

Canvas Mouse Up
├── Dragging → handleDragMouseUp + pushState
├── Connecting → endConnection + pushState
└── Box Select → handleSelectionBoxEnd
```

### Key Implementation Details

1. **History is only pushed on action completion**, not during drag
2. **Selection is separate from history** - you can undo without losing selection
3. **Keyboard shortcuts are registered once** in a useEffect
4. **Selection box uses canvas coordinates** for accurate selection

---

## Future Enhancements

### Phase 3+ Considerations

1. **Copy/Paste**
   - Add clipboard state to track copied items
   - Generate new IDs on paste
   - Offset pasted items to avoid overlap

2. **Multi-node Drag**
   - When multiple nodes selected, dragging one drags all
   - Maintain relative positions

3. **History Browser**
   - UI to visualize and jump to any history point
   - Show action descriptions

4. **Delta-based History**
   - For large workflows, store only changes
   - Significant memory savings

---

## Troubleshooting

### Common Issues

**Undo doesn't work**
- Check that `pushState` is called after state changes
- Verify `canUndo` is true

**Selection not working**
- Ensure `handleNodeClick` is passed to CanvasNode
- Check that modifier keys are being passed correctly

**Keyboard shortcuts not firing**
- Verify shortcuts are registered in useEffect
- Check if focus is in an input field
- Ensure no other handlers are stopping propagation

**Selection box not appearing**
- Verify `selectionBox.isActive` is true
- Check that coordinates are in canvas space, not screen space

---

## Developer Notes

### Adding New Actions

When adding a new user action:

1. Perform the state update
2. Call `pushState` with action description
3. Update selection if needed
4. Add keyboard shortcut if applicable

```typescript
const handleNewAction = useCallback(() => {
  // 1. Update state
  const newNodes = [...nodes, newNode];

  // 2. Push to history
  pushState({ nodes: newNodes, connections }, 'my-new-action');

  // 3. Update selection (optional)
  handleSelectionNodeClick(newNode.id);
}, [nodes, connections, pushState, handleSelectionNodeClick]);
```

### Testing Checklist

- [ ] Single click selects node
- [ ] Shift+click toggles selection
- [ ] Ctrl+click adds to selection
- [ ] Box selection works
- [ ] Undo/redo buttons enable/disable correctly
- [ ] Ctrl+Z undoes last action
- [ ] Ctrl+Shift+Z redoes action
- [ ] Delete key removes selected items
- [ ] Escape clears selection
- [ ] History persists after multiple actions

---

*Last Updated: Phase 2 Implementation*
*Version: 2.0.0*
