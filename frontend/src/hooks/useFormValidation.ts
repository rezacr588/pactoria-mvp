import { useState, useCallback, useEffect, useMemo } from 'react';

export interface ValidationRule {
  required?: boolean | string;
  minLength?: number | { value: number; message: string };
  maxLength?: number | { value: number; message: string };
  pattern?: RegExp | { value: RegExp; message: string };
  email?: boolean | string;
  url?: boolean | string;
  number?: boolean | string;
  min?: number | { value: number; message: string };
  max?: number | { value: number; message: string };
  custom?: (value: any) => string | boolean;
  match?: string; // Field name to match
}

export interface FormField {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

export interface FormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  debounceMs?: number;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  dirty: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (name: keyof T, value: any) => void;
  setError: (name: keyof T, error: string) => void;
  setTouched: (name: keyof T, touched?: boolean) => void;
  setFieldValue: (name: keyof T, value: any, shouldValidate?: boolean) => void;
  validateField: (name: keyof T) => Promise<string | undefined>;
  validateForm: () => Promise<boolean>;
  handleChange: (name: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (name: keyof T) => (e: React.FocusEvent) => void;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: React.FormEvent) => Promise<void>;
  reset: (newValues?: Partial<T>) => void;
  clearErrors: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
}

const defaultValidationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  number: 'Please enter a valid number',
  minLength: (min: number) => `Minimum ${min} characters required`,
  maxLength: (max: number) => `Maximum ${max} characters allowed`,
  min: (min: number) => `Value must be at least ${min}`,
  max: (max: number) => `Value must be at most ${max}`,
  pattern: 'Invalid format',
  match: (field: string) => `Must match ${field}`,
};

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule>>,
  options: FormValidationOptions = {}
): UseFormValidationReturn<T> {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    debounceMs = 300,
  } = options;

  const [formState, setFormState] = useState<FormState>(() => {
    const state: FormState = {};
    Object.keys(initialValues).forEach(key => {
      state[key] = {
        value: initialValues[key],
        touched: false,
        dirty: false,
      };
    });
    return state;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debounceTimeouts, setDebounceTimeouts] = useState<Record<string, NodeJS.Timeout>>({});

  // Extract values, errors, touched, and dirty states
  const values = useMemo(() => {
    const vals = {} as T;
    Object.keys(formState).forEach(key => {
      vals[key as keyof T] = formState[key].value;
    });
    return vals;
  }, [formState]);

  const errors = useMemo(() => {
    const errs = {} as Record<keyof T, string>;
    Object.keys(formState).forEach(key => {
      errs[key as keyof T] = formState[key].error || '';
    });
    return errs;
  }, [formState]);

  const touched = useMemo(() => {
    const touchedState = {} as Record<keyof T, boolean>;
    Object.keys(formState).forEach(key => {
      touchedState[key as keyof T] = formState[key].touched;
    });
    return touchedState;
  }, [formState]);

  const dirty = useMemo(() => {
    const dirtyState = {} as Record<keyof T, boolean>;
    Object.keys(formState).forEach(key => {
      dirtyState[key as keyof T] = formState[key].dirty;
    });
    return dirtyState;
  }, [formState]);

  const isValid = useMemo(() => {
    return Object.values(errors).every(error => !error);
  }, [errors]);

  const validateSingleField = useCallback((name: keyof T, value: any, allValues: T): string | undefined => {
    const rules = validationRules[name];
    if (!rules) return undefined;

    // Required validation
    if (rules.required) {
      const isEmpty = value === '' || value === null || value === undefined || 
                     (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        return typeof rules.required === 'string' ? rules.required : defaultValidationMessages.required;
      }
    }

    // Skip other validations if value is empty and not required
    const isEmpty = value === '' || value === null || value === undefined;
    if (isEmpty && !rules.required) return undefined;

    // Email validation
    if (rules.email && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return typeof rules.email === 'string' ? rules.email : defaultValidationMessages.email;
      }
    }

    // URL validation
    if (rules.url && value) {
      try {
        new URL(value);
      } catch {
        return typeof rules.url === 'string' ? rules.url : defaultValidationMessages.url;
      }
    }

    // Number validation
    if (rules.number && value) {
      if (isNaN(Number(value))) {
        return typeof rules.number === 'string' ? rules.number : defaultValidationMessages.number;
      }
    }

    // Min length validation
    if (rules.minLength && value) {
      const minLen = typeof rules.minLength === 'number' ? rules.minLength : rules.minLength.value;
      if (String(value).length < minLen) {
        return typeof rules.minLength === 'object' 
          ? rules.minLength.message 
          : defaultValidationMessages.minLength(minLen);
      }
    }

    // Max length validation
    if (rules.maxLength && value) {
      const maxLen = typeof rules.maxLength === 'number' ? rules.maxLength : rules.maxLength.value;
      if (String(value).length > maxLen) {
        return typeof rules.maxLength === 'object'
          ? rules.maxLength.message
          : defaultValidationMessages.maxLength(maxLen);
      }
    }

    // Min value validation
    if (rules.min !== undefined && value !== '') {
      const minVal = typeof rules.min === 'number' ? rules.min : rules.min.value;
      if (Number(value) < minVal) {
        return typeof rules.min === 'object'
          ? rules.min.message
          : defaultValidationMessages.min(minVal);
      }
    }

    // Max value validation
    if (rules.max !== undefined && value !== '') {
      const maxVal = typeof rules.max === 'number' ? rules.max : rules.max.value;
      if (Number(value) > maxVal) {
        return typeof rules.max === 'object'
          ? rules.max.message
          : defaultValidationMessages.max(maxVal);
      }
    }

    // Pattern validation
    if (rules.pattern && value) {
      const pattern = typeof rules.pattern === 'object' && 'value' in rules.pattern 
        ? rules.pattern.value 
        : rules.pattern as RegExp;
      if (!pattern.test(value)) {
        return typeof rules.pattern === 'object' && 'message' in rules.pattern
          ? rules.pattern.message
          : defaultValidationMessages.pattern;
      }
    }

    // Match validation
    if (rules.match && value) {
      const matchValue = allValues[rules.match as keyof T];
      if (value !== matchValue) {
        return defaultValidationMessages.match(rules.match);
      }
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value);
      if (typeof result === 'string') {
        return result;
      }
      if (result === false) {
        return 'Validation failed';
      }
    }

    return undefined;
  }, [validationRules]);

  const validateField = useCallback(async (name: keyof T): Promise<string | undefined> => {
    const currentValues = { ...values };
    const error = validateSingleField(name, currentValues[name], currentValues);
    
    setFormState(prev => ({
      ...prev,
      [name]: {
        ...prev[name as string],
        error,
      },
    }));
    
    return error;
  }, [values, validateSingleField]);

  const validateForm = useCallback(async (): Promise<boolean> => {
    const currentValues = { ...values };
    const newFormState = { ...formState };
    let hasErrors = false;

    Object.keys(validationRules).forEach(key => {
      const error = validateSingleField(key as keyof T, currentValues[key], currentValues);
      newFormState[key as string] = {
        ...newFormState[key as string],
        error,
        touched: true,
      };
      if (error) hasErrors = true;
    });

    setFormState(newFormState);
    return !hasErrors;
  }, [values, formState, validationRules, validateSingleField]);

  const setValue = useCallback((name: keyof T, value: any) => {
    setFormState(prev => ({
      ...prev,
      [name]: {
        ...prev[name as string],
        value,
        dirty: value !== initialValues[name],
      },
    }));
  }, [initialValues]);

  const setError = useCallback((name: keyof T, error: string) => {
    setFormState(prev => ({
      ...prev,
      [name]: {
        ...prev[name as string],
        error,
      },
    }));
  }, []);

  const setTouched = useCallback((name: keyof T, touchedValue = true) => {
    setFormState(prev => ({
      ...prev,
      [name]: {
        ...prev[name as string],
        touched: touchedValue,
      },
    }));
  }, []);

  const setFieldValue = useCallback((name: keyof T, value: any, shouldValidate = true) => {
    setValue(name, value);
    
    if (shouldValidate && validateOnChange) {
      // Clear existing timeout
      if (debounceTimeouts[name as string]) {
        clearTimeout(debounceTimeouts[name as string]);
      }

      // Set new timeout for validation
      const timeout = setTimeout(() => {
        validateField(name);
      }, debounceMs);

      setDebounceTimeouts(prev => ({
        ...prev,
        [name as string]: timeout,
      }));
    }
  }, [setValue, validateOnChange, validateField, debounceMs, debounceTimeouts]);

  const handleChange = useCallback((name: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    
    setFieldValue(name, value, validateOnChange);
  }, [setFieldValue, validateOnChange]);

  const handleBlur = useCallback((name: keyof T) => () => {
    setTouched(name, true);
    if (validateOnBlur) {
      validateField(name);
    }
  }, [setTouched, validateOnBlur, validateField]);

  const handleSubmit = useCallback((onSubmit: (values: T) => void | Promise<void>) => async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    let isFormValid = true;
    if (validateOnSubmit) {
      isFormValid = await validateForm();
    }
    
    if (isFormValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  }, [values, validateOnSubmit, validateForm]);

  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = newValues ? { ...initialValues, ...newValues } : initialValues;
    const newState: FormState = {};
    
    Object.keys(resetValues).forEach(key => {
      newState[key] = {
        value: resetValues[key as keyof T],
        touched: false,
        dirty: false,
        error: undefined,
      };
    });
    
    setFormState(newState);
    setIsSubmitting(false);
    
    // Clear debounce timeouts
    Object.values(debounceTimeouts).forEach(timeout => {
      clearTimeout(timeout);
    });
    setDebounceTimeouts({});
  }, [initialValues, debounceTimeouts]);

  const clearErrors = useCallback(() => {
    setFormState(prev => {
      const newState = { ...prev };
      Object.keys(newState).forEach(key => {
        newState[key] = {
          ...newState[key],
          error: undefined,
        };
      });
      return newState;
    });
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimeouts).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [debounceTimeouts]);

  return {
    values,
    errors,
    touched,
    dirty,
    isValid,
    isSubmitting,
    setValue,
    setError,
    setTouched,
    setFieldValue,
    validateField,
    validateForm,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    clearErrors,
    setSubmitting,
  };
}