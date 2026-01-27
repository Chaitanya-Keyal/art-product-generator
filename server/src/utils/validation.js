export function validateRequired(value, fieldName) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
        const error = new Error(`${fieldName} is required`);
        error.statusCode = 400;
        throw error;
    }
}

export function validateEnum(value, allowedValues, fieldName) {
    if (!allowedValues[value]) {
        const error = new Error(`Invalid ${fieldName}`);
        error.statusCode = 400;
        error.validOptions = Object.keys(allowedValues);
        throw error;
    }
}

export function validateArray(value, fieldName) {
    if (value && !Array.isArray(value)) {
        const error = new Error(`${fieldName} must be an array`);
        error.statusCode = 400;
        throw error;
    }
}
