# Phase 3 Documentation: Config Forms + Advanced Form Components

## Overview

Phase 3 introduces a comprehensive form system for node configuration in the Open Agent Artel workflow editor. This includes dynamic form generation, validation, and a rich set of form field components.

---

## Architecture

### File Structure

```
src/
├── hooks/
│   └── useForm.ts               # Form state management hook
├── lib/
│   └── nodeConfig.ts            # Node configuration schemas
├── components/ui-custom/
│   └── FormFields.tsx           # Reusable form field components
└── components/
    └── ConfigPanel.tsx          # Node configuration panel
```

---

## 1. Form State Management (`useForm.ts`)

### Purpose
A comprehensive React hook for managing form state, validation, and submission.

### Features
- Form value management with type safety
- Field touched tracking
- Error state management
- Form submission handling
- Field-level and form-level validation
- Reset functionality
- Dirty state tracking

### API

```typescript
const form = useForm<T>({
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit?: (values: T) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
});
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `values` | `T` | Current form values |
| `errors` | `Partial<Record<keyof T, string>>` | Form errors |
| `touched` | `FormTouched` | Touched fields |
| `isDirty` | `boolean` | Whether form has changed |
| `isValid` | `boolean` | Whether form is valid |
| `isSubmitting` | `boolean` | Whether form is submitting |
| `setFieldValue` | `(field, value) => void` | Set a field value |
| `setFieldTouched` | `(field, isTouched?) => void` | Set field touched |
| `resetForm` | `(newInitialValues?) => void` | Reset form |
| `handleSubmit` | `(e?) => Promise<void>` | Submit form |
| `getFieldProps` | `(field) => FieldProps` | Get field binding props |

### Usage Example

```tsx
const form = useForm({
  initialValues: { name: '', email: '' },
  validate: (values) => {
    const errors: Record<string, string> = {};
    if (!values.name) errors.name = 'Name is required';
    return errors;
  },
  onSubmit: (values) => {
    console.log('Submitted:', values);
  },
});

// In JSX
<input
  value={form.values.name}
  onChange={(e) => form.setFieldValue('name', e.target.value)}
  onBlur={() => form.setFieldTouched('name')}
/>
{form.errors.name && <span>{form.errors.name}</span>}
```

---

## 2. Node Configuration Schemas (`nodeConfig.ts`)

### Purpose
Defines configuration schemas for all node types, specifying fields, types, validation, and defaults.

### Schema Structure

```typescript
interface NodeConfigSchema {
  nodeType: NodeType;
  title: string;
  description?: string;
  sections: ConfigSection[];
}

interface ConfigSection {
  id: string;
  title: string;
  description?: string;
  fields: ConfigField[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

interface ConfigField {
  id: string;
  type: ConfigFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  validation?: ValidationRules;
  options?: SelectOption[];
  defaultValue?: unknown;
  disabled?: boolean;
  hidden?: boolean;
  dependsOn?: { field: string; value: unknown };
}
```

### Supported Field Types

| Type | Description |
|------|-------------|
| `text` | Single-line text input |
| `textarea` | Multi-line text input |
| `password` | Password input |
| `number` | Number input with increment/decrement |
| `boolean` | Toggle switch |
| `select` | Dropdown select |
| `multiselect` | Multi-select dropdown |
| `json` | JSON editor with formatting |
| `code` | Code editor with syntax highlighting |
| `credentials` | Credential selector |

### Validation Rules

```typescript
interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
  validator?: (value: unknown) => string | undefined;
}
```

### Predefined Schemas

- `aiAgentConfigSchema` - AI Agent node configuration
- `triggerConfigSchema` - Trigger node configuration
- `httpToolConfigSchema` - HTTP Request node configuration
- `codeToolConfigSchema` - Code node configuration
- `memoryConfigSchema` - Memory node configuration

### Usage Example

```typescript
import { getNodeConfigSchema, getDefaultValues } from '@/lib/nodeConfig';

const schema = getNodeConfigSchema('ai-agent');
const defaults = getDefaultValues(schema);
```

---

## 3. Form Field Components (`FormFields.tsx`)

### Purpose
Reusable form field components with consistent styling and validation display.

### Components

#### TextField
```tsx
<TextField
  id="name"
  label="Name"
  value={value}
  onChange={setValue}
  onBlur={handleBlur}
  placeholder="Enter name"
  error="Name is required"
  touched={true}
  required
/>
```

#### TextAreaField
```tsx
<TextAreaField
  id="description"
  label="Description"
  value={value}
  onChange={setValue}
  rows={4}
  maxLength={500}
/>
```

#### NumberField
```tsx
<NumberField
  id="temperature"
  label="Temperature"
  value={0.7}
  onChange={setValue}
  min={0}
  max={2}
  step={0.1}
/>
```

#### SelectField
```tsx
<SelectField
  id="model"
  label="AI Model"
  value={value}
  onChange={setValue}
  options={[
    { label: 'GPT-4', value: 'gpt-4' },
    { label: 'GPT-3.5', value: 'gpt-3.5' },
  ]}
/>
```

#### BooleanField
```tsx
<BooleanField
  id="enabled"
  label="Enabled"
  value={true}
  onChange={setValue}
/>
```

#### JsonField
```tsx
<JsonField
  id="headers"
  label="Headers"
  value={{ 'Content-Type': 'application/json' }}
  onChange={setValue}
/>
```

#### CodeField
```tsx
<CodeField
  id="code"
  label="Code"
  value="return input;"
  onChange={setValue}
  language="javascript"
/>
```

#### CredentialsField
```tsx
<CredentialsField
  id="credentials"
  label="API Credentials"
  value="cred-1"
  onChange={setValue}
/>
```

---

## 4. Config Panel (`ConfigPanel.tsx`)

### Purpose
Side panel for configuring selected nodes with dynamic form generation.

### Features
- Dynamic form generation from schema
- Section collapsing
- Field validation
- Save/Cancel actions
- Real-time updates
- Field dependency (show/hide based on other fields)

### Props

```typescript
interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: NodeData;
  onUpdate?: (nodeId: string, config: Partial<NodeData>) => void;
}
```

### Usage Example

```tsx
<ConfigPanel
  isOpen={isConfigPanelOpen}
  onClose={() => setIsConfigPanelOpen(false)}
  nodeData={selectedNode}
  onUpdate={(nodeId, updates) => {
    updateNode(nodeId, updates);
  }}
/>
```

---

## Integration in WorkflowEditorPage

### Form Integration

```tsx
// Handle node configuration update
const handleNodeUpdate = useCallback(
  (nodeId: string, updates: Partial<NodeData>) => {
    const newNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, ...updates } : n
    );
    pushState({ nodes: newNodes, connections }, 'update-node-config');
    showSuccess('Configuration saved');
  },
  [nodes, connections, pushState, showSuccess]
);

// Render config panel
{isConfigPanelOpen && selectedNode && (
  <ConfigPanel
    isOpen={isConfigPanelOpen}
    onClose={() => {
      setIsConfigPanelOpen(false);
      clearSelection();
    }}
    nodeData={selectedNode}
    onUpdate={handleNodeUpdate}
  />
)}
```

---

## Field Dependencies

Fields can be shown/hidden based on other field values:

```typescript
{
  id: 'webhookPath',
  type: 'text',
  label: 'Webhook Path',
  dependsOn: { field: 'triggerType', value: 'webhook' },
}
```

When `triggerType` is 'webhook', the `webhookPath` field will be visible.

---

## Testing Checklist

### Form Fields
- [ ] TextField renders and accepts input
- [ ] TextAreaField renders with character count
- [ ] NumberField has increment/decrement buttons
- [ ] SelectField shows options correctly
- [ ] BooleanField toggles on click
- [ ] JsonField formats JSON on button click
- [ ] CodeField shows language indicator
- [ ] CredentialsField lists available credentials

### Validation
- [ ] Required fields show error when empty
- [ ] Min/max validation works for numbers
- [ ] Pattern validation works for text
- [ ] Errors display below fields
- [ ] Form submission blocked when invalid

### Config Panel
- [ ] Panel opens when node selected
- [ ] Sections collapse/expand
- [ ] Field dependencies work
- [ ] Save updates node configuration
- [ ] Reset restores original values
- [ ] Dirty state indicator shows

---

## Future Enhancements

### Form Fields
- [ ] Rich text editor field
- [ ] File upload field
- [ ] Color picker field
- [ ] Date/time picker field
- [ ] Array/list field
- [ ] Object/nested field

### Validation
- [ ] Async validation
- [ ] Cross-field validation
- [ ] Conditional validation

### Config Panel
- [ ] Tabbed sections
- [ ] Search/filter fields
- [ ] Field help tooltips
- [ ] Copy/paste configuration

---

*Last Updated: Phase 3 Implementation*
*Version: 3.0.0*
