export function buildUserHistoryEntry(prompt, timestamp, selectedImages = []) {
    return {
        role: 'user',
        prompt,
        timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
        ...(selectedImages.length > 0 && { selectedImages }),
    };
}

export function buildAssistantHistoryEntry(text, images, timestamp, errors = null) {
    return {
        role: 'model',
        text: text || 'Images generated successfully',
        images,
        timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp,
        ...(errors && errors.length > 0 && { errors }),
    };
}

export function buildGenerationPrompt(artFormKey, productType, additionalInstructions) {
    let prompt = `Generate ${artFormKey} style design on a ${productType}`;
    if (additionalInstructions) {
        prompt += `. ${additionalInstructions}`;
    }
    return prompt;
}
