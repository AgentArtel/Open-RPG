/**
 * ============================================================================
 * USE FORM HOOK
 * ============================================================================
 *
 * PURPOSE:
 * Comprehensive form state management with validation support.
 * Handles form values, touched states, errors, and submission.
 *
 * FEATURES:
 * - Form value management
 * - Field touched tracking
 * - Error state management
 * - Form submission handling
 * - Field-level and form-level validation
 * - Reset functionality
 * - Dirty state tracking
 *
 * USAGE:
 * ```tsx
 * const form = useForm({
 *   initialValues: { name: '', email: '' },
 *   validate: (values) => {
 *     const errors: Record<string, string> = {};
 *     if (!values.name) errors.name = 'Name is required';
 *     return errors;
 *   },
 *   onSubmit: (values) => {
 *     console.log('Submitted:', values);
 *   },
 * });
 *
 * // In JSX
 * <input
 *   value={form.values.name}
 *   onChange={(e) => form.setFieldValue('name', e.target.value)}
 *   onBlur={() => form.setFieldTouched('name')}
 * />
 * {form.errors.name && <span>{form.errors.name}</span>}
 * ```
 *
 * @author Open Agent Artel Team
 * @version 3.0.0 (Phase 3)
 * ============================================================================
 */

import { useState, useCallback, useMemo, useRef } from 'react';

/** Form values type */
export type FormValues = Record<string, unknown>;

/** Form errors type */
export type FormErrors = Record<string, string>;

/** Form touched state type */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormTouched = Record<any, boolean | undefined>;

/** Validation function type */
export type ValidateFunction<T extends FormValues> = (values: T) => Partial<Record<keyof T, string>>;

/** Submit handler type */
export type SubmitHandler<T extends FormValues> = (values: T) => void | Promise<void>;

export interface UseFormOptions<T extends FormValues> {
  /** Initial form values */
  initialValues: T;
  /** Validation function */
  validate?: ValidateFunction<T>;
  /** Submit handler */
  onSubmit?: SubmitHandler<T>;
  /** Validate on change */
  validateOnChange?: boolean;
  /** Validate on blur */
  validateOnBlur?: boolean;
}

export interface UseFormReturn<T extends FormValues> {
  /** Current form values */
  values: T;
  /** Form errors */
  errors: Partial<Record<keyof T, string>>;
  /** Touched fields */
  touched: FormTouched;
  /** Whether form is dirty (values changed from initial) */
  isDirty: boolean;
  /** Whether form is valid */
  isValid: boolean;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Whether form has been submitted */
  isSubmitted: boolean;
  /** Set a field value */
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Set multiple field values */
  setValues: (values: Partial<T>) => void;
  /** Set a field touched state */
  setFieldTouched: (field: keyof T, isTouched?: boolean) => void;
  /** Set a field error */
  setFieldError: (field: keyof T, error: string | undefined) => void;
  /** Set form errors */
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  /** Reset form to initial state */
  resetForm: (newInitialValues?: T) => void;
  /** Validate form */
  validateForm: () => Partial<Record<keyof T, string>>;
  /** Validate a single field */
  validateField: (field: keyof T) => string | undefined;
  /** Handle form submission */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Get field props for binding */
  getFieldProps: <K extends keyof T>(field: K) => {
    value: T[K];
    onChange: (value: T[K]) => void;
    onBlur: () => void;
    error: string | undefined;
    touched: boolean;
  };
}

export function useForm<T extends FormValues>(options: UseFormOptions<T>): UseFormReturn<T> {
  const {
    initialValues,
    validate,
    onSubmit,
    validateOnChange = false,
    validateOnBlur = true,
  } = options;

  // Form state
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Refs for tracking initial values and dirty state
  const initialValuesRef = useRef(initialValues);

  /**
   * Check if form is dirty
   */
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);
  }, [values]);

  /**
   * Check if form is valid
   */
  const isValid = useMemo(() => {
    if (!validate) return true;
    const validationErrors = validate(values);
    return Object.keys(validationErrors).length === 0;
  }, [values, validate]);

  /**
   * Set a field value
   */
  const setFieldValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));

      // Validate on change if enabled
      if (validateOnChange && validate) {
        const fieldError = validateFieldInternal(field, { ...values, [field]: value });
        setErrors((prev) => ({ ...prev, [field]: fieldError }));
      }
    },
    [values, validate, validateOnChange]
  );

  /**
   * Set multiple field values
   */
  const setValuesCallback = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
  }, []);

  /**
   * Set a field touched state
   */
  const setFieldTouched = useCallback(
    (field: keyof T, isTouched = true) => {
      setTouched((prev) => ({ ...prev, [field]: isTouched }));

      // Validate on blur if enabled
      if (validateOnBlur && validate && isTouched) {
        const fieldError = validateFieldInternal(field, values);
        setErrors((prev) => ({ ...prev, [field]: fieldError }));
      }
    },
    [values, validate, validateOnBlur]
  );

  /**
   * Set a field error
   */
  const setFieldError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  }, []);

  /**
   * Set form errors
   */
  const setErrorsCallback = useCallback((newErrors: Partial<Record<keyof T, string>>) => {
    setErrors(newErrors);
  }, []);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback((newInitialValues?: T) => {
    const resetValues = newInitialValues ?? initialValuesRef.current;
    initialValuesRef.current = resetValues;
    setValues(resetValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setIsSubmitted(false);
  }, []);

  /**
   * Internal field validation
   */
  const validateFieldInternal = useCallback(
    (field: keyof T, vals: T): string | undefined => {
      if (!validate) return undefined;
      const validationErrors = validate(vals);
      return validationErrors[field];
    },
    [validate]
  );

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (field: keyof T): string | undefined => {
      const error = validateFieldInternal(field, values);
      setErrors((prev) => ({ ...prev, [field]: error }));
      return error;
    },
    [values, validateFieldInternal]
  );

  /**
   * Validate entire form
   */
  const validateForm = useCallback((): Partial<Record<keyof T, string>> => {
    if (!validate) return {};
    const validationErrors = validate(values);
    setErrors(validationErrors);
    return validationErrors;
  }, [values, validate]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitted(true);

      // Validate form
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        // Mark all fields as touched to show errors
        const allTouched: FormTouched = {};
        Object.keys(values).forEach((key) => {
          allTouched[key] = true;
        });
        setTouched(allTouched);
        return;
      }

      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validateForm, onSubmit]
  );

  /**
   * Get field props for easy binding
   */
  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => ({
      value: values[field],
      onChange: (value: T[K]) => setFieldValue(field, value),
      onBlur: () => setFieldTouched(field),
      error: errors[field],
      touched: touched[field] || false,
    }),
    [values, errors, touched, setFieldValue, setFieldTouched]
  );

  return {
    values,
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
    isSubmitted,
    setFieldValue,
    setValues: setValuesCallback,
    setFieldTouched,
    setFieldError,
    setErrors: setErrorsCallback,
    resetForm,
    validateForm,
    validateField,
    handleSubmit,
    getFieldProps,
  };
}
