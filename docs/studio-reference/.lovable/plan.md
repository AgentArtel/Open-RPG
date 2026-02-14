

# Improve Port Connection UX and Add Quick-Connect

## Overview

Three improvements to make connecting nodes fast and intuitive:
1. Larger port hit areas with snap-to-port magnetism
2. Visual indicators showing compatible ports while dragging a connection
3. Auto-connect when dropping Memory/HTTP Tool nodes near an AI Agent

## Problem Analysis

Current issues found in the code:
- Port handles are 12-16px CSS (w-3, w-4) -- too small to reliably click
- Hit detection radius is only 15px in canvas coordinates -- easy to miss
- No visual feedback during connection dragging -- users can't tell which ports accept the connection
- Node width mismatch: CSS renders 220px but `getPortPosition` uses 200px default, causing port positions to be slightly off
- No proximity-based auto-connect for sub-nodes

## Changes

### 1. Fix Port Size Mismatch and Enlarge Hit Areas

**File: `src/components/canvas/CanvasNode.tsx`**

- Increase all port handle sizes from `w-4 h-4` / `w-3 h-3` to `w-5 h-5` (20px)
- Add an invisible larger hit area around each port (32px) using an outer div -- this is the clickable zone, while the visual circle stays small and clean
- Accept new props: `highlightedPorts` (which ports to glow as compatible) and `isConnectionDrawing` (whether a connection drag is active)
- When a port is in `highlightedPorts`, pulse it with a green/purple/blue glow and scale it up

### 2. Fix Node Width Constant

**File: `src/lib/canvasUtils.ts`**

- Change default `nodeWidth` from 200 to 220 in `getPortPosition` to match the actual CSS width
- This fixes port position alignment for connection lines

### 3. Add Snap-to-Port and Compatible Port Highlighting

**File: `src/hooks/useConnectionDraw.ts`**

- Increase hit detection radius from 15 to 30 canvas pixels
- Add a `nearestCompatiblePort` state that tracks the closest compatible port while dragging
- When the mouse is within 40px of a compatible port, snap the temp connection endpoint to that port's exact position (magnetism)
- Export `nearestCompatiblePort` and `fromPortType` so the editor can pass them to CanvasNode for highlighting
- Add a `getCompatiblePorts()` function that returns all ports that can accept the current dragging connection (based on `isValidConnection`)

### 4. Highlight Compatible Ports During Drag

**File: `src/pages/WorkflowEditorPage.tsx`**

- Read `drawState` from `useConnectionDraw` to get the current `fromPortType`
- Compute `highlightedPorts` -- a set of `{nodeId, portId}` for all compatible target ports across all nodes
- Pass `highlightedPorts` and `isConnectionDrawing` to each `CanvasNode`
- When connection drawing is active, all non-compatible ports dim to 30% opacity

### 5. Auto-Connect on Node Drop (Quick-Connect)

**File: `src/pages/WorkflowEditorPage.tsx`** -- Modify `handleAddNode`

When a Memory or HTTP Tool / Code Tool node is added:
1. Find the nearest AI Agent node on the canvas
2. If one exists within reasonable distance (or just the first agent), auto-create a connection:
   - Memory node output -> Agent's memory port
   - HTTP Tool / Code Tool output -> Agent's tool port
3. Show a toast: "Auto-connected to AI Agent"

This also applies in `onDragEnd` for the node drag hook -- when a user finishes dragging a Memory/Tool node, check proximity to any AI Agent and auto-connect if within ~150px of the agent's relevant port.

### 6. Update TempConnectionLine for Snap Feedback

**File: `src/components/canvas/TempConnectionLine.tsx`**

- Accept an optional `isSnapped` prop
- When snapped, change the dashed line to solid and brighten the color to indicate the connection will land

## Files Summary

| File | Action |
|------|--------|
| `src/components/canvas/CanvasNode.tsx` | Modify -- larger hit areas, highlighted port states |
| `src/lib/canvasUtils.ts` | Modify -- fix nodeWidth default to 220 |
| `src/hooks/useConnectionDraw.ts` | Modify -- snap-to-port, compatible port detection, larger hit radius |
| `src/pages/WorkflowEditorPage.tsx` | Modify -- pass highlight props, auto-connect on add/drop |
| `src/components/canvas/TempConnectionLine.tsx` | Modify -- snap visual feedback |

## Technical Details

Port compatibility mapping (from `portRegistry.ts`):
- Dragging from `output` -> compatible with `input`, and also `tool`/`memory` on agent (via `isValidConnection` which checks `compatibleWith`)
- Actually: `output.compatibleWith = ['input']`, `tool.compatibleWith = ['output']`, `memory.compatibleWith = ['output']`
- So when dragging FROM an output port, we need to find ports that list 'output' in their `compatibleWith` -- that's `input`, `tool`, and `memory`
- The `isValidConnection` function checks `fromPort.compatibleWith.includes(toPort.type)` -- so output->input works, but output->tool fails because output's compatibleWith is `['input']`, not `['tool']`
- Fix needed: update `isValidConnection` to be bidirectional -- check if either port's compatibleWith includes the other

### Auto-connect proximity check:
```text
For each AI Agent node:
  agentToolPort = getPortPosition(agent.position, 'tool', 220, ...)
  agentMemoryPort = getPortPosition(agent.position, 'memory', 220, ...)
  
  If dropped node is memory && distance(droppedNode.outputPort, agentMemoryPort) < 150:
    create connection: droppedNode.output -> agent.memory
    
  If dropped node is http-tool/code-tool && distance(droppedNode.outputPort, agentToolPort) < 150:
    create connection: droppedNode.output -> agent.tool
```

