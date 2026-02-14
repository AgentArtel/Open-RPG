/**
 * ============================================================================
 * n8n WORKFLOW IMPORTER
 * ============================================================================
 *
 * PURPOSE:
 * Converts raw n8n workflow JSON into Artel's internal format (NodeData[] +
 * Connection[]). Also detects missing configuration — credential references
 * and environment variables — so the UI can prompt the user.
 *
 * PURE FUNCTION:
 * `convertN8nWorkflow` has no side effects. It receives parsed JSON and
 * returns a result object. All error handling is via thrown Error instances
 * with descriptive messages.
 *
 * NODE TYPE MAPPING:
 * n8n uses namespaced type strings like "@n8n/n8n-nodes-langchain.chatTrigger".
 * We pattern-match against the last segment (after the last dot) to map to
 * Artel's NodeType union. Unmapped types become 'custom-tool' with the
 * original n8n type stored in config._n8nType.
 *
 * CONNECTION CONVERSION:
 * n8n connections are keyed by source node *name* (some newer exports use ID).
 * We build a name→id map and fall back to direct ID matching. Output types
 * are mapped to Artel port names (main → output/input, ai_* → tool/input, etc.).
 *
 * MISSING CONFIG DETECTION:
 * - Credential references: extracted from each node's `credentials` object.
 * - Environment variables: detected via regex scanning of all parameter values
 *   for the pattern {{ $env.VAR_NAME }}.
 *
 * @author Open Agent Artel Team
 * @version 1.0.0
 * ============================================================================
 */

import type {
  NodeType,
  NodeData,
  Connection,
  N8nWorkflowJSON,
  N8nNode,
  N8nImportResult,
} from '@/types';

// =============================================================================
// NODE TYPE MAPPING
// =============================================================================

/**
 * Maps n8n type substrings to Artel NodeType values.
 * Order matters: more specific patterns should come first to avoid
 * false matches (e.g., "chatTrigger" before "agent").
 *
 * The matching algorithm checks if the n8n type string (case-insensitive)
 * contains each key. First match wins.
 */
const N8N_TYPE_MAP: [string, NodeType][] = [
  // Triggers
  ['chatTrigger', 'trigger'],
  ['webhookTrigger', 'trigger'],
  ['webhook', 'trigger'],
  ['manualTrigger', 'trigger'],

  // AI Agents & Chains
  ['chainLlm', 'ai-agent'],
  ['agent', 'ai-agent'],

  // OpenAI
  ['lmChatOpenai', 'openai-chat'],
  ['openAi', 'openai-chat'],

  // Anthropic
  ['lmChatAnthropic', 'anthropic-chat'],
  ['anthropic', 'anthropic-chat'],

  // HTTP
  ['toolHttpRequest', 'http-tool'],
  ['httpRequest', 'http-tool'],

  // Code
  ['codeTool', 'code-tool'],
  ['code', 'code-tool'],

  // Memory / Vector Store
  ['vectorStore', 'memory'],
  ['memory', 'memory'],

  // Schedule
  ['schedule', 'schedule'],
  ['cron', 'schedule'],

  // Logic
  ['switch', 'if'],
  ['if', 'if'],
  ['merge', 'merge'],
];

/**
 * Resolve an n8n node type string to an Artel NodeType.
 * Falls back to 'custom-tool' for unrecognized types.
 */
function resolveNodeType(n8nType: string): NodeType {
  const lowerType = n8nType.toLowerCase();
  for (const [pattern, artelType] of N8N_TYPE_MAP) {
    if (lowerType.includes(pattern.toLowerCase())) {
      return artelType;
    }
  }
  return 'custom-tool';
}

// =============================================================================
// PORT MAPPING
// =============================================================================

/**
 * Maps n8n output type keys to Artel fromPort/toPort pairs.
 * Unknown output types default to output→input.
 */
function mapPorts(outputType: string): { fromPort: string; toPort: string } {
  switch (outputType) {
    case 'ai_languageModel':
      return { fromPort: 'tool', toPort: 'input' };
    case 'ai_tool':
      return { fromPort: 'tool', toPort: 'input' };
    case 'ai_memory':
      return { fromPort: 'memory', toPort: 'input' };
    case 'main':
    default:
      return { fromPort: 'output', toPort: 'input' };
  }
}

// =============================================================================
// ENV VAR DETECTION
// =============================================================================

/**
 * Regex to detect n8n environment variable references.
 * Matches patterns like {{ $env.MY_VAR }} or {{$env.MY_VAR}}.
 * The capture group extracts the variable name.
 */
const ENV_VAR_REGEX = /\{\{\s*\$env\.(\w+)\s*\}\}/g;

/**
 * Recursively walk a value (string, object, array) and collect
 * all unique environment variable names referenced via {{ $env.VAR }}.
 */
function collectEnvVars(value: unknown, found: Set<string>): void {
  if (typeof value === 'string') {
    let match: RegExpExecArray | null;
    // Reset regex lastIndex for safety (global flag)
    ENV_VAR_REGEX.lastIndex = 0;
    while ((match = ENV_VAR_REGEX.exec(value)) !== null) {
      found.add(match[1]);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectEnvVars(item, found);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectEnvVars((value as Record<string, unknown>)[key], found);
    }
  }
}

// =============================================================================
// MAIN CONVERTER
// =============================================================================

/**
 * Convert an n8n workflow JSON object to Artel format.
 *
 * @param json - Parsed n8n workflow JSON (validated at runtime)
 * @returns N8nImportResult with nodes, connections, workflow name, and missing config
 * @throws Error with descriptive message if JSON is malformed
 *
 * @example
 * ```ts
 * const raw = JSON.parse(fileContents);
 * const result = convertN8nWorkflow(raw);
 * // result.nodes, result.connections are ready for reset()
 * // result.missing lists credentials/env vars the user should provide
 * ```
 */
export function convertN8nWorkflow(json: N8nWorkflowJSON): N8nImportResult {
  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid n8n workflow: expected a JSON object.');
  }
  if (!Array.isArray(json.nodes)) {
    throw new Error('Invalid n8n workflow: "nodes" must be an array.');
  }
  if (!json.connections || typeof json.connections !== 'object') {
    throw new Error('Invalid n8n workflow: "connections" must be an object.');
  }

  // -------------------------------------------------------------------------
  // Build name → id map (n8n connections reference nodes by name)
  // -------------------------------------------------------------------------
  const nameToId = new Map<string, string>();
  const idSet = new Set<string>();

  for (const n8nNode of json.nodes) {
    const nodeId = n8nNode.id || `n8n-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    nameToId.set(n8nNode.name, nodeId);
    idSet.add(nodeId);
  }

  // -------------------------------------------------------------------------
  // Convert nodes
  // -------------------------------------------------------------------------
  const nodes: NodeData[] = json.nodes.map((n8nNode: N8nNode, index: number) => {
    const artelType = resolveNodeType(n8nNode.type);
    const nodeId = nameToId.get(n8nNode.name)!;

    // Position: n8n uses [x, y] array; default to index-based layout if missing
    const position = Array.isArray(n8nNode.position) && n8nNode.position.length >= 2
      ? { x: n8nNode.position[0], y: n8nNode.position[1] }
      : { x: index * 250, y: 0 };

    // Build config from n8n parameters + metadata
    const config: Record<string, unknown> = {
      ...n8nNode.parameters,
      _n8nTypeVersion: n8nNode.typeVersion,
    };

    // For unmapped (custom-tool) nodes, also store the original n8n type
    if (artelType === 'custom-tool') {
      config._n8nType = n8nNode.type;
    }

    // Store credential reference names in config for later binding
    if (n8nNode.credentials) {
      const credNames: Record<string, string> = {};
      for (const [credType, credRef] of Object.entries(n8nNode.credentials)) {
        credNames[credType] = credRef.name;
      }
      config._n8nCredentials = credNames;
    }

    return {
      id: nodeId,
      type: artelType,
      position,
      title: n8nNode.name,
      subtitle: artelType === 'custom-tool' ? n8nNode.type.split('.').pop() : undefined,
      config,
      isConfigured: false,
    };
  });

  if (nodes.length === 0) {
    throw new Error('No importable nodes found in this workflow.');
  }

  // -------------------------------------------------------------------------
  // Convert connections
  // -------------------------------------------------------------------------
  const connections: Connection[] = [];
  let connIndex = 0;

  for (const [sourceKey, outputTypes] of Object.entries(json.connections)) {
    // Resolve source key: try as node name first, then as node ID
    let sourceId = nameToId.get(sourceKey);
    if (!sourceId && idSet.has(sourceKey)) {
      sourceId = sourceKey;
    }
    if (!sourceId) {
      console.warn(`[n8nImporter] Connection key "${sourceKey}" matches neither a node name nor ID — skipping.`);
      continue;
    }

    // Iterate ALL output type keys (main, ai_languageModel, ai_tool, etc.)
    for (const [outputType, outputIndexes] of Object.entries(outputTypes)) {
      const ports = mapPorts(outputType);

      // outputIndexes is an array of arrays: outer = output index, inner = targets
      for (const targets of outputIndexes) {
        if (!Array.isArray(targets)) continue;

        for (const target of targets) {
          // Resolve target node name → id (same fallback logic)
          let targetId = nameToId.get(target.node);
          if (!targetId && idSet.has(target.node)) {
            targetId = target.node;
          }
          if (!targetId) {
            console.warn(`[n8nImporter] Connection target "${target.node}" not found — skipping.`);
            continue;
          }

          connections.push({
            id: `conn-${sourceId}-${targetId}-${connIndex++}`,
            from: sourceId,
            to: targetId,
            fromPort: ports.fromPort,
            toPort: ports.toPort,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Detect missing configuration
  // -------------------------------------------------------------------------

  // Credential references
  const credentialRefs: N8nImportResult['missing']['credentialRefs'] = [];
  for (const n8nNode of json.nodes) {
    if (n8nNode.credentials) {
      const nodeId = nameToId.get(n8nNode.name)!;
      for (const [credType, credRef] of Object.entries(n8nNode.credentials)) {
        credentialRefs.push({
          nodeId,
          nodeTitle: n8nNode.name,
          credentialType: credType,
          n8nCredName: credRef.name,
        });
      }
    }
  }

  // Environment variables
  const envVarSet = new Set<string>();
  for (const n8nNode of json.nodes) {
    collectEnvVars(n8nNode.parameters, envVarSet);
  }

  return {
    nodes,
    connections,
    workflowName: json.name || 'Imported Workflow',
    missing: {
      credentialRefs,
      envVars: Array.from(envVarSet),
    },
  };
}
