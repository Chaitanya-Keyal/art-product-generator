export const IMAGE_GENERATION = {
    DEFAULT_COUNT: 1,
    MAX_COUNT: 4,
    ASPECT_RATIO: '1:1',
    IMAGE_SIZE: '2K',
    SUPPORTED_FORMATS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
};

export const MIME_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

export const GEMINI_MODEL_ID = 'gemini-3-pro-image-preview';

export const SESSION_LIMITS = {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
};

export const UPLOAD_LIMITS = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};
