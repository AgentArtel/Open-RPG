/**
 * ============================================================================
 * CONFIG PANEL COMPONENT
 * ============================================================================
 *
 * PURPOSE:
 * Side panel for configuring selected nodes. Dynamically renders form fields
 * based on the node's configuration schema.
 *
 * FEATURES:
 * - Dynamic form generation from schema
 * - Field validation
 * - Section collapsing
 * - Save/Cancel actions
 * - Real-time updates
 *
 * @author Open Agent Artel Team
 * @version 3.0.0 (Phase 3)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronUp, X, Save, RotateCcw } from 'lucide-react';
import { useForm } from '@/hooks/useForm';
import {
  getNodeConfigSchema,
  getDefaultValues,
  validateField,
  type ConfigField,
} from '@/lib/nodeConfig';
import {
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  BooleanField,
  JsonField,
  CodeField,
  CredentialsField,
} from '@/components/ui-custom/FormFields';
import type { NodeData } from '@/types';

export interface ConfigPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose: () => void;
  /** Node data to configure */
  nodeData: NodeData;
  /** Callback when node is updated */
  onUpdate?: (nodeId: string, config: Record<string, unknown>) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Section Header Component
 */
interface SectionHeaderProps {
  title: string;
  description?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  isCollapsed,
  onToggle,
}) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
  >
    <div className="text-left">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description && (
        <p className="text-xs text-white/50 mt-0.5">{description}</p>
      )}
    </div>
    {isCollapsed ? (
      <ChevronDown className="w-4 h-4 text-white/40" />
    ) : (
      <ChevronUp className="w-4 h-4 text-white/40" />
    )}
  </button>
);

/**
 * Render a form field based on its type
 */
const renderField = (
  field: ConfigField,
  form: ReturnType<typeof useForm<Record<string, unknown>>>,
  isVisible: boolean
): React.ReactNode => {
  if (!isVisible) return null;

  const fieldProps = form.getFieldProps(field.id);
  const commonProps = {
    id: field.id,
    label: field.label,
    description: field.description,
    required: field.required,
    disabled: field.disabled,
    error: fieldProps.error,
    touched: fieldProps.touched,
  };

  switch (field.type) {
    case 'text':
    case 'password':
      return (
        <TextField
          {...commonProps}
          type={field.type}
          value={(fieldProps.value as string) || ''}
          onChange={fieldProps.onChange}
          onBlur={fieldProps.onBlur}
          placeholder={field.placeholder}
        />
      );

    case 'textarea':
      return (
        <TextAreaField
          {...commonProps}
          value={(fieldProps.value as string) || ''}
          onChange={fieldProps.onChange}
          onBlur={fieldProps.onBlur}
          placeholder={field.placeholder}
          maxLength={field.validation?.max}
        />
      );

    case 'number':
      return (
        <NumberField
          {...commonProps}
          value={(fieldProps.value as number) || 0}
          onChange={fieldProps.onChange}
          onBlur={fieldProps.onBlur}
          placeholder={field.placeholder}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );

    case 'select':
      return (
        <SelectField
          {...commonProps}
          value={(fieldProps.value as string) || ''}
          onChange={fieldProps.onChange}
          onBlur={fieldProps.onBlur}
          options={(field.options || []) as Array<{ label: string; value: string; description?: string }>}
          placeholder={field.placeholder}
        />
      );

    case 'boolean':
      return (
        <BooleanField
          {...commonProps}
          value={(fieldProps.value as boolean) || false}
          onChange={fieldProps.onChange}
        />
      );

    case 'json':
      return (
        <JsonField
          {...commonProps}
          value={fieldProps.value}
          onChange={fieldProps.onChange}
          onBlur={fieldProps.onBlur}
          placeholder={field.placeholder}
        />
      );

    case 'code':
      return (
        <CodeField
          {...commonProps}
          value={(fieldProps.value as string) || ''}
          onChange={fieldProps.onChange}
          onBlur={fieldProps.onBlur}
          placeholder={field.placeholder}
        />
      );

    case 'credentials':
      return (
        <CredentialsField
          {...commonProps}
          value={(fieldProps.value as string) || ''}
          onChange={fieldProps.onChange}
          onBlur={fieldProps.onBlur}
        />
      );

    default:
      return (
        <TextField
          {...commonProps}
          value={(fieldProps.value as string) || ''}
          onChange={fieldProps.onChange}
          onBlur={fieldProps.onBlur}
          placeholder={field.placeholder}
        />
      );
  }
};

/**
 * Config Panel Component
 */
export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  isOpen,
  onClose,
  nodeData,
  onUpdate,
  className,
}) => {
  // Get schema for this node type
  const schema = useMemo(
    () => getNodeConfigSchema(nodeData.type),
    [nodeData.type]
  );

  // Get initial values from node config or schema defaults
  const initialValues = useMemo(() => {
    const defaults = schema ? getDefaultValues(schema) : {};
    return {
      ...defaults,
      ...(nodeData.config || {}),
      name: nodeData.title,
    };
  }, [schema, nodeData.config, nodeData.title]);

  // Track collapsed sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    schema?.sections.forEach((section) => {
      if (section.collapsible) {
        initial[section.id] = section.defaultCollapsed || false;
      }
    });
    return initial;
  });

  // Initialize form with generic type
  const form = useForm<Record<string, unknown>>({
    initialValues: initialValues as Record<string, unknown>,
    validate: (values) => {
      const errors: Record<string, string> = {};

      if (!schema) return errors;

      // Validate each field
      schema.sections.forEach((section) => {
        section.fields.forEach((field) => {
          const fieldValue = values[field.id];
          const error = validateField(fieldValue, field);
          if (error) {
            errors[field.id] = error;
          }
        });
      });

      return errors;
    },
    onSubmit: (values) => {
      // Extract name separately
      const { name, ...config } = values as Record<string, unknown>;

      onUpdate?.(nodeData.id, {
        title: name as string,
        config,
        isConfigured: true,
      });
    },
    validateOnBlur: true,
    validateOnChange: false,
  });

  // Reset form when node changes
  useEffect(() => {
    form.resetForm(initialValues);
  }, [nodeData.id, initialValues]);

  // Toggle section collapse
  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Check if field should be visible (dependency check)
  const isFieldVisible = useCallback(
    (field: ConfigField): boolean => {
      if (!field.dependsOn) return true;

      const dependentValue = form.values[field.dependsOn.field];
      return dependentValue === field.dependsOn.value;
    },
    [form.values]
  );

  // Handle save
  const handleSave = useCallback(() => {
    form.handleSubmit();
    if (form.isValid) {
      onClose();
    }
  }, [form, onClose]);

  // Handle reset
  const handleReset = useCallback(() => {
    form.resetForm(initialValues);
  }, [form, initialValues]);

  if (!isOpen || !schema) return null;

  return (
    <div
      className={cn(
        'fixed right-0 top-16 bottom-0 w-96',
        'bg-dark-100 border-l border-white/5',
        'shadow-dark-lg z-30',
        'animate-in slide-in-from-right duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div>
          <h2 className="text-lg font-semibold text-white">{schema.title}</h2>
          {schema.description && (
            <p className="text-xs text-white/50 mt-0.5">{schema.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <ScrollArea className="h-[calc(100%-140px)]">
        <form onSubmit={form.handleSubmit} className="p-4 space-y-4">
          {schema.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-xl border border-white/5 overflow-hidden"
            >
              {section.collapsible ? (
                <>
                  <SectionHeader
                    title={section.title}
                    description={section.description}
                    isCollapsed={collapsedSections[section.id]}
                    onToggle={() => toggleSection(section.id)}
                  />
                  {!collapsedSections[section.id] && (
                    <div className="p-4 space-y-4 border-t border-white/5">
                      {section.fields.map((field) => (
                        <div key={field.id}>
                          {renderField(field, form, isFieldVisible(field))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                  {section.description && (
                    <p className="text-xs text-white/50">{section.description}</p>
                  )}
                  {section.fields.map((field) => (
                    <div key={field.id}>
                      {renderField(field, form, isFieldVisible(field))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </form>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-dark-100">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!form.isDirty}
            className="flex-1 text-white/60 hover:text-white hover:bg-white/5"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!form.isDirty || form.isSubmitting}
            className="flex-1 bg-green text-dark hover:bg-green-light disabled:opacity-50"
          >
            {form.isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
        {form.isDirty && (
          <p className="text-xs text-white/40 text-center mt-2">
            You have unsaved changes
          </p>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
