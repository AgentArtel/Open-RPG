/**
 * ============================================================================
 * NODE CONFIGURATION SCHEMAS
 * ============================================================================
 *
 * PURPOSE:
 * Defines configuration schemas for all node types in the workflow editor.
 * Each schema specifies the fields, types, validation, and defaults.
 *
 * SCHEMA STRUCTURE:
 * - field id: Unique identifier for the field
 * - type: Field type (text, textarea, select, number, boolean, json, etc.)
 * - label: Display label
 * - description: Help text
 * - placeholder: Input placeholder
 * - required: Whether field is required
 * - validation: Validation rules
 * - options: For select fields
 * - defaultValue: Default value
 *
 * @author Open Agent Artel Team
 * @version 3.0.0 (Phase 3)
 * ============================================================================
 */

import type { NodeType } from '@/types';

/** Field types supported in node configuration */
export type ConfigFieldType =
  | 'text'
  | 'textarea'
  | 'password'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'code'
  | 'credentials'
  | 'resource'
  | 'color'
  | 'date'
  | 'time'
  | 'datetime';

/** Validation rules for a field */
export interface ValidationRules {
  /** Whether field is required */
  required?: boolean;
  /** Minimum length (for text) or value (for number) */
  min?: number;
  /** Maximum length (for text) or value (for number) */
  max?: number;
  /** Regular expression pattern */
  pattern?: string;
  /** Custom validation message */
  message?: string;
  /** Custom validator function */
  validator?: (value: unknown) => string | undefined;
}

/** Select option */
export interface SelectOption {
  label: string;
  value: string | number;
  description?: string;
  disabled?: boolean;
}

/** Configuration field definition */
export interface ConfigField {
  /** Field identifier */
  id: string;
  /** Field type */
  type: ConfigFieldType;
  /** Display label */
  label: string;
  /** Help text/description */
  description?: string;
  /** Input placeholder */
  placeholder?: string;
  /** Whether field is required */
  required?: boolean;
  /** Validation rules */
  validation?: ValidationRules;
  /** Options for select/multiselect */
  options?: SelectOption[];
  /** Default value */
  defaultValue?: unknown;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Whether field is hidden */
  hidden?: boolean;
  /** Field dependencies (show/hide based on other fields) */
  dependsOn?: {
    field: string;
    value: unknown;
  };
  /** Load options dynamically */
  loadOptions?: () => Promise<SelectOption[]>;
}

/** Configuration section */
export interface ConfigSection {
  /** Section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Fields in this section */
  fields: ConfigField[];
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/** Node configuration schema */
export interface NodeConfigSchema {
  /** Node type this schema applies to */
  nodeType: NodeType;
  /** Schema title */
  title: string;
  /** Schema description */
  description?: string;
  /** Configuration sections */
  sections: ConfigSection[];
}

// =============================================================================
// AI AGENT NODE CONFIGURATION
// =============================================================================

export const aiAgentConfigSchema: NodeConfigSchema = {
  nodeType: 'ai-agent',
  title: 'AI Agent Configuration',
  description: 'Configure the AI agent behavior and capabilities',
  sections: [
    {
      id: 'general',
      title: 'General Settings',
      fields: [
        {
          id: 'name',
          type: 'text',
          label: 'Agent Name',
          description: 'A unique name for this agent',
          placeholder: 'My AI Agent',
          required: true,
          validation: {
            required: true,
            min: 1,
            max: 100,
          },
          defaultValue: 'AI Agent',
        },
        {
          id: 'description',
          type: 'textarea',
          label: 'Description',
          description: 'Describe what this agent does',
          placeholder: 'This agent helps with...',
          validation: {
            max: 500,
          },
        },
        {
          id: 'model',
          type: 'select',
          label: 'AI Model',
          description: 'Select the AI model to use',
          required: true,
          options: [
            { label: 'GPT-4o', value: 'gpt-4o', description: 'Most capable model' },
            { label: 'GPT-4o Mini', value: 'gpt-4o-mini', description: 'Fast and cost-effective' },
            { label: 'GPT-4', value: 'gpt-4', description: 'High quality responses' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', description: 'Fast responses' },
            { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet', description: 'Anthropic model' },
            { label: 'Claude 3 Opus', value: 'claude-3-opus', description: 'Most capable Anthropic model' },
          ],
          defaultValue: 'gpt-4o-mini',
        },
        {
          id: 'credentials',
          type: 'credentials',
          label: 'API Credentials',
          description: 'Select API credentials to use',
          required: true,
        },
      ],
    },
    {
      id: 'behavior',
      title: 'Behavior Settings',
      collapsible: true,
      fields: [
        {
          id: 'systemPrompt',
          type: 'textarea',
          label: 'System Prompt',
          description: 'Instructions that define the agent behavior',
          placeholder: 'You are a helpful assistant...',
          validation: {
            max: 4000,
          },
          defaultValue: 'You are a helpful AI assistant. Answer questions accurately and concisely.',
        },
        {
          id: 'temperature',
          type: 'number',
          label: 'Temperature',
          description: 'Controls randomness (0 = deterministic, 2 = very random)',
          validation: {
            min: 0,
            max: 2,
          },
          defaultValue: 0.7,
        },
        {
          id: 'maxTokens',
          type: 'number',
          label: 'Max Tokens',
          description: 'Maximum number of tokens in the response',
          validation: {
            min: 1,
            max: 8192,
          },
          defaultValue: 2048,
        },
        {
          id: 'topP',
          type: 'number',
          label: 'Top P',
          description: 'Nucleus sampling parameter',
          validation: {
            min: 0,
            max: 1,
          },
          defaultValue: 1,
        },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced Settings',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          id: 'timeout',
          type: 'number',
          label: 'Timeout (seconds)',
          description: 'Maximum time to wait for a response',
          validation: {
            min: 1,
            max: 300,
          },
          defaultValue: 60,
        },
        {
          id: 'retryCount',
          type: 'number',
          label: 'Retry Count',
          description: 'Number of retries on failure',
          validation: {
            min: 0,
            max: 5,
          },
          defaultValue: 3,
        },
        {
          id: 'streamResponse',
          type: 'boolean',
          label: 'Stream Response',
          description: 'Stream the response as it is generated',
          defaultValue: false,
        },
      ],
    },
  ],
};

// =============================================================================
// TRIGGER NODE CONFIGURATION
// =============================================================================

export const triggerConfigSchema: NodeConfigSchema = {
  nodeType: 'trigger',
  title: 'Trigger Configuration',
  description: 'Configure when this workflow is triggered',
  sections: [
    {
      id: 'trigger',
      title: 'Trigger Settings',
      fields: [
        {
          id: 'triggerType',
          type: 'select',
          label: 'Trigger Type',
          description: 'What triggers this workflow',
          required: true,
          options: [
            { label: 'Webhook', value: 'webhook', description: 'HTTP webhook endpoint' },
            { label: 'Schedule', value: 'schedule', description: 'Run on a schedule' },
            { label: 'Chat Message', value: 'chat', description: 'When chat message received' },
            { label: 'Manual', value: 'manual', description: 'Run manually only' },
          ],
          defaultValue: 'chat',
        },
        {
          id: 'webhookPath',
          type: 'text',
          label: 'Webhook Path',
          description: 'Custom path for webhook endpoint',
          placeholder: '/webhook/my-trigger',
          dependsOn: { field: 'triggerType', value: 'webhook' },
          validation: {
            pattern: '^/[a-zA-Z0-9-_/]+$',
            message: 'Must start with / and contain only alphanumeric characters, hyphens, and underscores',
          },
        },
        {
          id: 'schedule',
          type: 'text',
          label: 'Cron Schedule',
          description: 'Cron expression for scheduled execution',
          placeholder: '0 0 * * *',
          dependsOn: { field: 'triggerType', value: 'schedule' },
          validation: {
            required: true,
          },
        },
        {
          id: 'timezone',
          type: 'select',
          label: 'Timezone',
          description: 'Timezone for scheduled execution',
          dependsOn: { field: 'triggerType', value: 'schedule' },
          options: [
            { label: 'UTC', value: 'UTC' },
            { label: 'Eastern Time (ET)', value: 'America/New_York' },
            { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
            { label: 'Central European Time (CET)', value: 'Europe/Berlin' },
            { label: 'Japan Standard Time (JST)', value: 'Asia/Tokyo' },
          ],
          defaultValue: 'UTC',
        },
      ],
    },
  ],
};

// =============================================================================
// HTTP TOOL NODE CONFIGURATION
// =============================================================================

export const httpToolConfigSchema: NodeConfigSchema = {
  nodeType: 'http-tool',
  title: 'HTTP Request Configuration',
  description: 'Configure the HTTP request',
  sections: [
    {
      id: 'request',
      title: 'Request Settings',
      fields: [
        {
          id: 'method',
          type: 'select',
          label: 'HTTP Method',
          description: 'HTTP method to use',
          required: true,
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'HEAD', value: 'HEAD' },
            { label: 'OPTIONS', value: 'OPTIONS' },
          ],
          defaultValue: 'GET',
        },
        {
          id: 'url',
          type: 'text',
          label: 'URL',
          description: 'The URL to send the request to',
          placeholder: 'https://api.example.com/data',
          required: true,
          validation: {
            required: true,
            pattern: '^https?://.+',
            message: 'Must be a valid HTTP or HTTPS URL',
          },
        },
        {
          id: 'headers',
          type: 'json',
          label: 'Headers',
          description: 'HTTP headers as JSON object',
          placeholder: '{"Content-Type": "application/json"}',
          defaultValue: {},
        },
        {
          id: 'body',
          type: 'textarea',
          label: 'Request Body',
          description: 'Request body (for POST, PUT, PATCH)',
          placeholder: '{"key": "value"}',
          dependsOn: { field: 'method', value: 'POST' },
        },
        {
          id: 'timeout',
          type: 'number',
          label: 'Timeout (seconds)',
          description: 'Request timeout in seconds',
          validation: {
            min: 1,
            max: 300,
          },
          defaultValue: 30,
        },
      ],
    },
    {
      id: 'auth',
      title: 'Authentication',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          id: 'authType',
          type: 'select',
          label: 'Authentication Type',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Bearer Token', value: 'bearer' },
            { label: 'Basic Auth', value: 'basic' },
            { label: 'API Key', value: 'apiKey' },
          ],
          defaultValue: 'none',
        },
        {
          id: 'credentials',
          type: 'credentials',
          label: 'Credentials',
          description: 'Select credentials to use',
          dependsOn: { field: 'authType', value: 'bearer' },
        },
      ],
    },
  ],
};

// =============================================================================
// CODE TOOL NODE CONFIGURATION
// =============================================================================

export const codeToolConfigSchema: NodeConfigSchema = {
  nodeType: 'code-tool',
  title: 'Code Configuration',
  description: 'Write custom code to process data',
  sections: [
    {
      id: 'code',
      title: 'Code Settings',
      fields: [
        {
          id: 'language',
          type: 'select',
          label: 'Language',
          description: 'Programming language',
          required: true,
          options: [
            { label: 'JavaScript', value: 'javascript' },
            { label: 'Python', value: 'python' },
            { label: 'TypeScript', value: 'typescript' },
          ],
          defaultValue: 'javascript',
        },
        {
          id: 'code',
          type: 'code',
          label: 'Code',
          description: 'Your custom code',
          placeholder: '// Write your code here\nreturn input;',
          required: true,
          validation: {
            required: true,
          },
          defaultValue: '// Process the input data\nreturn input;',
        },
        {
          id: 'timeout',
          type: 'number',
          label: 'Timeout (seconds)',
          description: 'Maximum execution time',
          validation: {
            min: 1,
            max: 60,
          },
          defaultValue: 5,
        },
      ],
    },
  ],
};

// =============================================================================
// MEMORY NODE CONFIGURATION
// =============================================================================

export const memoryConfigSchema: NodeConfigSchema = {
  nodeType: 'memory',
  title: 'Memory Configuration',
  description: 'Configure conversation memory storage',
  sections: [
    {
      id: 'storage',
      title: 'Storage Settings',
      fields: [
        {
          id: 'storageType',
          type: 'select',
          label: 'Storage Type',
          description: 'Type of memory storage',
          required: true,
          options: [
            { label: 'PostgreSQL', value: 'postgres' },
            { label: 'Redis', value: 'redis' },
            { label: 'MongoDB', value: 'mongodb' },
            { label: 'SQLite', value: 'sqlite' },
            { label: 'In-Memory', value: 'memory' },
          ],
          defaultValue: 'postgres',
        },
        {
          id: 'credentials',
          type: 'credentials',
          label: 'Database Credentials',
          description: 'Select database credentials',
          required: true,
        },
        {
          id: 'sessionId',
          type: 'text',
          label: 'Session ID',
          description: 'Unique identifier for this conversation session',
          placeholder: 'session-123',
          defaultValue: '{{ $workflow.sessionId }}',
        },
        {
          id: 'windowSize',
          type: 'number',
          label: 'Window Size',
          description: 'Number of messages to keep in memory',
          validation: {
            min: 1,
            max: 100,
          },
          defaultValue: 10,
        },
      ],
    },
  ],
};

// =============================================================================
// SCHEMA REGISTRY
// =============================================================================

/** Map of node types to their configuration schemas */
export const nodeConfigSchemas: Partial<Record<NodeType, NodeConfigSchema>> = {
  'ai-agent': aiAgentConfigSchema,
  'trigger': triggerConfigSchema,
  'http-tool': httpToolConfigSchema,
  'code-tool': codeToolConfigSchema,
  'memory': memoryConfigSchema,
  'webhook': triggerConfigSchema,
  'openai-chat': aiAgentConfigSchema,
  'anthropic-chat': aiAgentConfigSchema,
  'custom-tool': codeToolConfigSchema,
  'schedule': triggerConfigSchema,
  'if': triggerConfigSchema,
  'merge': triggerConfigSchema,
};

/**
 * Get configuration schema for a node type
 */
export function getNodeConfigSchema(nodeType: NodeType): NodeConfigSchema | undefined {
  return nodeConfigSchemas[nodeType] || aiAgentConfigSchema;
}

/**
 * Get default values for a schema
 */
export function getDefaultValues(schema: NodeConfigSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  schema.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue;
      }
    });
  });

  return defaults;
}

/**
 * Validate field value against validation rules
 */
export function validateField(
  value: unknown,
  field: ConfigField
): string | undefined {
  const { validation, required, label } = field;

  // Required check
  if (required && (value === undefined || value === null || value === '')) {
    return `${label} is required`;
  }

  // Skip other validations if value is empty and not required
  if (!required && (value === undefined || value === null || value === '')) {
    return undefined;
  }

  if (!validation) return undefined;

  // String validations
  if (typeof value === 'string') {
    if (validation.min !== undefined && value.length < validation.min) {
      return `${label} must be at least ${validation.min} characters`;
    }
    if (validation.max !== undefined && value.length > validation.max) {
      return `${label} must be at most ${validation.max} characters`;
    }
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      return validation.message || `${label} format is invalid`;
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return `${label} must be at least ${validation.min}`;
    }
    if (validation.max !== undefined && value > validation.max) {
      return `${label} must be at most ${validation.max}`;
    }
  }

  // Custom validator
  if (validation.validator) {
    return validation.validator(value);
  }

  return undefined;
}

export default nodeConfigSchemas;