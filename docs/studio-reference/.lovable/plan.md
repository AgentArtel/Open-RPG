

# Make Memory and Tools Functional on the AI Agent Node

## Overview

Right now the AI Agent does a single `geminiChat()` call and ignores any connected Memory or Tool nodes. This plan makes both sub-node types real and modular:

- **Memory**: Persists conversation history in Supabase so the agent remembers past interactions across runs. Connected via the blue left-side port.
- **Tools**: Lets the agent call HTTP endpoints or run code during its reasoning loop. Connected via the purple right-side port. The agent describes available tools to Gemini, and when Gemini requests a tool call, we execute it and feed the result back -- looping until a final answer or max iterations.

## Architecture

```text
                    +------------------+
                    |   Memory Node    |
                    | (Postgres/Window)|
                    +--------+---------+
                             |
                     memory port (left)
                             |
+----------------+   +------+-------+   +----------------+
|  Trigger Node  +-->+  AI Agent    +<--+  HTTP Tool     |
|                |   |              |   |  (GET /api/x)  |
+----------------+   |  - loads mem |   +----------------+
                     |  - calls LLM |
                     |  - tool loop |   +----------------+
                     |  - saves mem +<--+  Code Tool     |
                     +--------------+   |  (JS snippet)  |
                      tool port (right) +----------------+
```

## Changes

### 1. Create Memory Table in Supabase

**New migration**: `studio_agent_memory`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| session_id | text | Groups messages by conversation session |
| role | text | "user", "assistant", or "system" |
| content | text | The message text |
| created_at | timestamptz | For ordering and windowing |
| workflow_id | uuid | Links to the workflow that owns this memory |

RLS: permissive all access (matching existing studio tables).

### 2. Create Memory Service

**New file: `src/lib/memoryService.ts`**

Two functions that the execution engine calls:

- `loadMemory(sessionId, windowSize)`: Fetches the last N messages from `studio_agent_memory` ordered by `created_at`, returns them as `{role, content}[]`
- `saveMemory(sessionId, messages, workflowId)`: Inserts new messages into the table

The session ID comes from the Memory node's config. If blank, it auto-generates one from the workflow ID + "default".

### 3. Update Memory Node Config

**File: `src/lib/nodeConfig.ts`** -- Revamp `memoryConfigSchema`

Replace the current fake options (Redis, MongoDB, SQLite) with real, useful fields:

- **Memory Type**: "Window Buffer" (keeps last N messages) -- the only type we support initially
- **Session ID**: text field (auto-generated if empty, or user can set a custom one for shared memory across workflows)
- **Window Size**: number (1-100, default 10) -- how many past messages to load
- **Clear on Run**: boolean -- whether to wipe memory before each execution

Remove the non-functional credential field and fake storage type options.

### 4. Update Tool Node Configs

**File: `src/lib/nodeConfig.ts`** -- Add `toolName` and `toolDescription` fields

Each tool node needs metadata the agent can read to describe the tool to Gemini:

- **Tool Name**: short identifier (e.g., "get_weather", "search_docs")
- **Tool Description**: what the tool does (e.g., "Fetches current weather for a given city")
- **Parameters Schema**: JSON field describing expected input parameters

These fields are added to `httpToolConfigSchema` and `codeToolConfigSchema` in a new "Tool Identity" section at the top.

### 5. Implement Tool Execution in the Engine

**File: `src/hooks/useExecution.ts`** -- Upgrade `ai-agent` case

The current agent does one call. The new flow:

1. **Gather connected sub-nodes**: Scan `connections` for edges where `to === agentNodeId` and `toPort === 'tool'` or `toPort === 'memory'`
2. **Load memory**: If a memory node is connected, call `loadMemory()` to get conversation history
3. **Build tool descriptions**: For each connected tool node, read its config (`toolName`, `toolDescription`, `url`/`code`) and format them into the system prompt
4. **Agent loop** (up to `maxIterations`):
   - Call `geminiChat()` with system prompt (including tool descriptions), memory messages, and user prompt
   - Parse response: if Gemini outputs a tool call block (using a structured `<tool_call>` format we define in the system prompt), extract tool name and arguments
   - Execute the matching tool node (HTTP fetch or code eval)
   - Append tool result to messages and loop
   - If no tool call detected, treat as final answer and break
5. **Save memory**: If memory node connected, save the user message + final agent response to `studio_agent_memory`
6. **Return results**: Include the final text, tool call logs (if `returnIntermediateSteps` is true), iteration count, and token usage

### 6. Implement HTTP Tool Execution

**File: `src/hooks/useExecution.ts`** -- Add real `http-tool` case

Replace the simulated delay with an actual fetch:

- Read `method`, `url`, `headers`, `body` from config
- Resolve `{{nodeId.field}}` templates in URL and body
- Make the fetch call via a new `execute-http` edge function (to avoid CORS issues)
- Return the response body as the tool result

### 7. Create HTTP Proxy Edge Function

**New file: `supabase/functions/execute-http/index.ts`**

A simple proxy that:
- Receives `{ method, url, headers, body }` from the client
- Makes the HTTP request server-side (bypassing CORS)
- Returns `{ success, statusCode, body, headers }`

This lets the HTTP Tool node call any external API.

### 8. Update Canvas Node to Show Connected Tools/Memory

**File: `src/components/canvas/CanvasNode.tsx`**

For `ai-agent` nodes, show badges for:
- Number of connected tools (count connections to the tool port)
- Whether memory is connected (check for memory port connection)
- Memory session ID if configured

This requires passing `connections` as a prop to CanvasNode, or computing it in the parent and passing a summary.

### 9. Update Memory Node Port Direction

**File: `src/lib/portRegistry.ts`**

Currently the memory node only has an `input` port. Change it to have an `output` port instead -- it outputs memory data *to* the agent's memory port. Similarly, tool nodes should output *to* the agent's tool port.

Update port compatibility:
- Memory node: `[OUTPUT_PORT]` -- connects FROM memory TO agent's memory port
- Tool nodes: `[OUTPUT_PORT]` -- connects FROM tool TO agent's tool port
- Agent memory port: compatible with `['output']`
- Agent tool port: compatible with `['output']`

## Execution Flow (with Tools and Memory)

```text
User clicks "Test"
  |
  v
Trigger -> pass-through
  |
  v
AI Agent:
  1. Find connected memory node -> load last 10 messages from DB
  2. Find connected tool nodes -> build tool descriptions
  3. System prompt = user's prompt + tool descriptions
  4. Messages = [loaded memory...] + [user prompt]
  5. Loop (max 5 iterations):
     a. Call geminiChat()
     b. Response contains <tool_call>get_weather({"city":"NYC"})</tool_call>?
        -> Execute HTTP Tool node (proxy fetch to weather API)
        -> Append tool result to messages
        -> Continue loop
     c. No tool call? -> Final answer, break
  6. Save [user msg, assistant msg] to studio_agent_memory
  7. Return { text, toolCalls, iterations, usage }
  |
  v
Results panel shows agent response + tool call log
```

## Files Summary

| File | Action |
|------|--------|
| New migration | Create `studio_agent_memory` table |
| `src/lib/memoryService.ts` | Create -- load/save memory from Supabase |
| `src/lib/nodeConfig.ts` | Modify -- revamp memory config, add tool identity fields |
| `src/hooks/useExecution.ts` | Modify -- agent loop with tool calling + memory integration |
| `src/lib/portRegistry.ts` | Modify -- fix memory/tool node port directions |
| `supabase/functions/execute-http/index.ts` | Create -- HTTP proxy for tool calls |
| `src/components/canvas/CanvasNode.tsx` | Modify -- show connected tools/memory count |
| `src/components/ExecutionResultsPanel.tsx` | Modify -- show tool call logs and iteration count |

## What This Enables

- Drop a Memory node, connect it to an agent -- the agent now remembers past conversations
- Drop an HTTP Tool node, configure it with an API URL and description, connect it to an agent -- the agent can now call that API during reasoning
- Chain multiple tools: the agent picks which tool to call based on the user's question
- Inspect tool call logs in the results panel to see the agent's reasoning process

