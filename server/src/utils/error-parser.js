export function parseGeminiError(error) {
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;

    try {
        const errorData = JSON.parse(errorMessage);
        if (errorData.error) {
            errorMessage = errorData.error.message || errorData.error;
            statusCode = errorData.error.code || statusCode;
        }
    } catch (_e) {
        // Not JSON, check if error has statusCode property
        if (error.statusCode) {
            statusCode = error.statusCode;
        }
    }

    return { message: errorMessage, statusCode };
}

export function createError(message, statusCode = 500) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}
