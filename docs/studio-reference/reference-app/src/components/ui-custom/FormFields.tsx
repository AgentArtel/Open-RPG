/**
 * ============================================================================
 * FORM FIELD COMPONENTS
 * ============================================================================
 *
 * PURPOSE:
 * Reusable form field components for node configuration forms.
 * Each component handles a specific field type with proper styling and validation.
 *
 * COMPONENTS:
 * - TextField: Single-line text input
 * - TextAreaField: Multi-line text input
 * - NumberField: Number input with increment/decrement
 * - SelectField: Dropdown select
 * - BooleanField: Toggle switch
 * - JsonField: JSON editor
 * - CodeField: Code editor
 * - CredentialsField: Credential selector
 *
 * @author Open Agent Artel Team
 * @version 3.0.0 (Phase 3)
 * ============================================================================
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Info } from 'lucide-react';

// =============================================================================
// BASE FIELD PROPS
// =============================================================================

export interface BaseFieldProps {
  id: string;
  label: string;
  description?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// =============================================================================
// TEXT FIELD
// =============================================================================

export interface TextFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'url';
}

export const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  error,
  touched,
  required,
  disabled,
  className,
}) => {
  const showError = touched && error;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
        {description && (
          <div className="group relative">
            <Info className="w-4 h-4 text-white/40 cursor-help" />
            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-dark-100 border border-white/10 rounded-lg text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {description}
            </div>
          </div>
        )}
      </div>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'bg-dark-100 border-white/10 text-white placeholder:text-white/30',
          'focus:border-green focus:ring-green/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          showError && 'border-danger focus:border-danger focus:ring-danger/20'
        )}
      />
      {showError && (
        <div className="flex items-center gap-1.5 text-danger text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// TEXTAREA FIELD
// =============================================================================

export interface TextAreaFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 4,
  maxLength,
  error,
  touched,
  required,
  disabled,
  className,
}) => {
  const showError = touched && error;
  const charCount = value?.length || 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
        {description && (
          <div className="group relative">
            <Info className="w-4 h-4 text-white/40 cursor-help" />
            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-dark-100 border border-white/10 rounded-lg text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {description}
            </div>
          </div>
        )}
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          'bg-dark-100 border-white/10 text-white placeholder:text-white/30 resize-vertical',
          'focus:border-green focus:ring-green/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          showError && 'border-danger focus:border-danger focus:ring-danger/20'
        )}
      />
      <div className="flex items-center justify-between">
        {showError ? (
          <div className="flex items-center gap-1.5 text-danger text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        ) : (
          <div />
        )}
        {maxLength && (
          <span className={cn(
            'text-xs',
            charCount > maxLength ? 'text-danger' : 'text-white/40'
          )}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// NUMBER FIELD
// =============================================================================

export interface NumberFieldProps extends BaseFieldProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  placeholder,
  min,
  max,
  step = 1,
  error,
  touched,
  required,
  disabled,
  className,
}) => {
  const showError = touched && error;

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    const newValue = (value || 0) + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  }, [value, step, max, disabled, onChange]);

  const handleDecrement = useCallback(() => {
    if (disabled) return;
    const newValue = (value || 0) - step;
    if (min === undefined || newValue >= min) {
      onChange(newValue);
    }
  }, [value, step, min, disabled, onChange]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
        {description && (
          <div className="group relative">
            <Info className="w-4 h-4 text-white/40 cursor-help" />
            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-dark-100 border border-white/10 rounded-lg text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {description}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && (value || 0) <= min)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-dark-100 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          -
        </button>
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onBlur={onBlur}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            'flex-1 bg-dark-100 border-white/10 text-white placeholder:text-white/30 text-center',
            'focus:border-green focus:ring-green/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            showError && 'border-danger focus:border-danger focus:ring-danger/20'
          )}
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && (value || 0) >= max)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-dark-100 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          +
        </button>
      </div>
      {showError && (
        <div className="flex items-center gap-1.5 text-danger text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SELECT FIELD
// =============================================================================

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

export interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Select an option',
  error,
  touched,
  required,
  disabled,
  className,
}) => {
  const showError = touched && error;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
        {description && (
          <div className="group relative">
            <Info className="w-4 h-4 text-white/40 cursor-help" />
            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-dark-100 border border-white/10 rounded-lg text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {description}
            </div>
          </div>
        )}
      </div>
      <Select
        value={value}
        onValueChange={onChange}
        onOpenChange={(open) => !open && onBlur?.()}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            'bg-dark-100 border-white/10 text-white',
            'focus:border-green focus:ring-green/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            showError && 'border-danger focus:border-danger'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-dark-100 border-white/10">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-white hover:bg-white/5 focus:bg-white/5 cursor-pointer"
            >
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-xs text-white/50">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showError && (
        <div className="flex items-center gap-1.5 text-danger text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// BOOLEAN FIELD (TOGGLE)
// =============================================================================

export interface BooleanFieldProps extends BaseFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export const BooleanField: React.FC<BooleanFieldProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  error,
  touched,
  disabled,
  className,
}) => {
  const showError = touched && error;

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg bg-dark-100/50 border border-white/5', className)}>
      <Switch
        id={id}
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-green mt-0.5"
      />
      <div className="flex-1 space-y-1">
        <Label htmlFor={id} className="text-sm font-medium text-white/90 cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-white/50">{description}</p>
        )}
        {showError && (
          <div className="flex items-center gap-1.5 text-danger text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// JSON FIELD
// =============================================================================

export interface JsonFieldProps extends BaseFieldProps {
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  placeholder?: string;
}

export const JsonField: React.FC<JsonFieldProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  placeholder = '{}',
  error,
  touched,
  required,
  disabled,
  className,
}) => {
  const [textValue, setTextValue] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | undefined>();

  const showError = (touched && error) || parseError;

  const handleChange = useCallback((newValue: string) => {
    setTextValue(newValue);
    try {
      const parsed = JSON.parse(newValue);
      setParseError(undefined);
      onChange(parsed);
    } catch (e) {
      setParseError('Invalid JSON');
    }
  }, [onChange]);

  const formatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(textValue);
      setTextValue(JSON.stringify(parsed, null, 2));
      setParseError(undefined);
    } catch (e) {
      setParseError('Invalid JSON');
    }
  }, [textValue]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={formatJson}
            disabled={disabled}
            className="text-xs text-green hover:text-green-light disabled:opacity-50"
          >
            Format JSON
          </button>
          {description && (
            <div className="group relative">
              <Info className="w-4 h-4 text-white/40 cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-dark-100 border border-white/10 rounded-lg text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {description}
              </div>
            </div>
          )}
        </div>
      </div>
      <Textarea
        id={id}
        value={textValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={6}
        disabled={disabled}
        className={cn(
          'bg-dark-100 border-white/10 text-white placeholder:text-white/30 resize-vertical font-mono text-sm',
          'focus:border-green focus:ring-green/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          showError && 'border-danger focus:border-danger focus:ring-danger/20'
        )}
      />
      {showError && (
        <div className="flex items-center gap-1.5 text-danger text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {parseError || error}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// CODE FIELD
// =============================================================================

export interface CodeFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  language?: string;
}

export const CodeField: React.FC<CodeFieldProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  placeholder,
  language = 'javascript',
  error,
  touched,
  required,
  disabled,
  className,
}) => {
  const showError = touched && error;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 px-2 py-0.5 rounded bg-dark-100 border border-white/10">
            {language}
          </span>
          {description && (
            <div className="group relative">
              <Info className="w-4 h-4 text-white/40 cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-dark-100 border border-white/10 rounded-lg text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {description}
              </div>
            </div>
          )}
        </div>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={10}
        disabled={disabled}
        className={cn(
          'bg-dark-100 border-white/10 text-white placeholder:text-white/30 resize-vertical font-mono text-sm',
          'focus:border-green focus:ring-green/20',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          showError && 'border-danger focus:border-danger focus:ring-danger/20'
        )}
      />
      {showError && (
        <div className="flex items-center gap-1.5 text-danger text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// CREDENTIALS FIELD
// =============================================================================

export interface CredentialOption {
  id: string;
  name: string;
  type: string;
}

export interface CredentialsFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  credentials?: CredentialOption[];
}

export const CredentialsField: React.FC<CredentialsFieldProps> = ({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  credentials = [],
  error,
  touched,
  required,
  disabled,
  className,
}) => {
  const showError = touched && error;

  // Default credentials for demo
  const defaultCredentials: CredentialOption[] = [
    { id: 'openai-1', name: 'OpenAI Account', type: 'openai' },
    { id: 'anthropic-1', name: 'Anthropic Account', type: 'anthropic' },
    { id: 'postgres-1', name: 'Production DB', type: 'postgres' },
    { id: 'redis-1', name: 'Redis Cache', type: 'redis' },
  ];

  const allCredentials = credentials.length > 0 ? credentials : defaultCredentials;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>
        {description && (
          <div className="group relative">
            <Info className="w-4 h-4 text-white/40 cursor-help" />
            <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-dark-100 border border-white/10 rounded-lg text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {description}
            </div>
          </div>
        )}
      </div>
      <Select
        value={value}
        onValueChange={onChange}
        onOpenChange={(open) => !open && onBlur?.()}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            'bg-dark-100 border-white/10 text-white',
            'focus:border-green focus:ring-green/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            showError && 'border-danger focus:border-danger'
          )}
        >
          <SelectValue placeholder="Select credentials" />
        </SelectTrigger>
        <SelectContent className="bg-dark-100 border-white/10">
          {allCredentials.map((cred) => (
            <SelectItem
              key={cred.id}
              value={cred.id}
              className="text-white hover:bg-white/5 focus:bg-white/5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green" />
                <span>{cred.name}</span>
                <span className="text-xs text-white/50">({cred.type})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center justify-between">
        {showError ? (
          <div className="flex items-center gap-1.5 text-danger text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        ) : (
          <div />
        )}
        <button
          type="button"
          className="text-xs text-green hover:text-green-light"
          onClick={() => {
            // Open credentials modal
            console.log('Open credentials modal');
          }}
        >
          + Manage Credentials
        </button>
      </div>
    </div>
  );
};

export default {
  TextField,
  TextAreaField,
  NumberField,
  SelectField,
  BooleanField,
  JsonField,
  CodeField,
  CredentialsField,
};
