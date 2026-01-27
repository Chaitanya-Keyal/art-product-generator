export function formatImageUrls(imagePaths) {
    return imagePaths.map((img) => `/${img}`);
}

export function sendSuccessResponse(res, data) {
    res.json({
        success: true,
        ...data,
        images: data.images ? formatImageUrls(data.images) : undefined,
    });
}

export function sendErrorResponse(res, error, defaultMessage) {
    console.error(`${defaultMessage}:`, error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        error: error.message || defaultMessage,
    });
}
