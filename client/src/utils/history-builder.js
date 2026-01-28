export function buildAssistantHistoryEntry(images, errors = null, turn = 0) {
    return {
        role: 'model',
        images,
        turn,
        ...(errors && errors.length > 0 && { errors }),
    };
}
