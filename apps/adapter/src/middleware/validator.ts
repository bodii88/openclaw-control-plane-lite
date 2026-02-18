import { Request, Response, NextFunction } from "express";
import { ApiError } from "./errorHandler.js";

export interface ValidationSchema {
    body?: Record<string, ValidatorRule>;
    query?: Record<string, ValidatorRule>;
    params?: Record<string, ValidatorRule>;
}

export interface ValidatorRule {
    type?: "string" | "number" | "boolean" | "array" | "object";
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: unknown[];
    custom?: (value: unknown) => boolean | string;
}

export const validate = (schema: ValidationSchema) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        const errors: string[] = [];
        
        const validateField = (value: unknown, rule: ValidatorRule, fieldName: string) => {
            // Required check
            if (rule.required && (value === undefined || value === null || value === "")) {
                return `${fieldName} is required`;
            }
            
            // Skip type checks if value is optional and not provided
            if (!rule.required && (value === undefined || value === null)) {
                return null;
            }
            
            // Type check
            if (rule.type) {
                const actualType = Array.isArray(value) ? "array" : typeof value;
                if (actualType !== rule.type) {
                    return `${fieldName} must be of type ${rule.type}, got ${actualType}`;
                }
            }
            
            // String validations
            if (typeof value === "string") {
                if (rule.minLength !== undefined && value.length < rule.minLength) {
                    return `${fieldName} must be at least ${rule.minLength} characters`;
                }
                if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                    return `${fieldName} must be at most ${rule.maxLength} characters`;
                }
                if (rule.pattern && !rule.pattern.test(value)) {
                    return `${fieldName} format is invalid`;
                }
            }
            
            // Enum check
            if (rule.enum && !rule.enum.includes(value)) {
                return `${fieldName} must be one of: ${rule.enum.join(", ")}`;
            }
            
            // Custom validation
            if (rule.custom) {
                const result = rule.custom(value);
                if (result !== true) {
                    return typeof result === "string" ? result : `${fieldName} is invalid`;
                }
            }
            
            return null;
        };
        
        // Validate body
        if (schema.body) {
            for (const [field, rule] of Object.entries(schema.body)) {
                const value = req.body?.[field];
                const error = validateField(value, rule, field);
                if (error) errors.push(error);
            }
        }
        
        // Validate query
        if (schema.query) {
            for (const [field, rule] of Object.entries(schema.query)) {
                const value = req.query?.[field];
                const error = validateField(value, rule, field);
                if (error) errors.push(error);
            }
        }
        
        // Validate params
        if (schema.params) {
            for (const [field, rule] of Object.entries(schema.params)) {
                const value = req.params?.[field];
                const error = validateField(value, rule, field);
                if (error) errors.push(error);
            }
        }
        
        if (errors.length > 0) {
            const error = new Error("Validation failed") as ApiError;
            error.statusCode = 400;
            error.code = "VALIDATION_ERROR";
            error.details = errors;
            return next(error);
        }
        
        next();
    };
};

// Common validators
export const validators = {
    slug: {
        type: "string" as const,
        required: true,
        pattern: /^[a-z0-9-]+\/[a-z0-9-]+$/,
    },
    cronExpression: {
        type: "string" as const,
        required: true,
        pattern: /^[\*\/\d\-,]+\s+[\*\/\d\-,]+\s+[\*\/\d\-,]+\s+[\*\/\d\-,]+\s+[\*\/\d\-,]+$/,
    },
    isoDate: {
        type: "string" as const,
        pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    },
    email: {
        type: "string" as const,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
};
