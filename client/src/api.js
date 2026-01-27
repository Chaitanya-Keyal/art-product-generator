import { handleApiResponse, apiCall } from './utils/api-handler.js';

const API_BASE = '/api';

export async function fetchArtForms() {
    return apiCall(async () => {
        const response = await fetch(`${API_BASE}/art-forms`);
        const data = await handleApiResponse(response, 'Failed to fetch art forms');
        return data.artForms;
    });
}

export async function generateImages({
    artFormKey,
    productType,
    referenceImage,
    additionalInstructions,
    numberOfImages,
}) {
    return apiCall(async () => {
        const formData = new FormData();
        formData.append('artFormKey', artFormKey);
        formData.append('productType', productType);

        if (numberOfImages && numberOfImages > 1) {
            formData.append('numberOfImages', numberOfImages);
        }

        if (additionalInstructions) {
            formData.append('additionalInstructions', additionalInstructions);
        }

        if (referenceImage) {
            formData.append('referenceImage', referenceImage);
        }

        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            body: formData,
        });

        return handleApiResponse(response, 'Failed to generate images');
    });
}

export async function modifyImages(sessionId, modificationPrompt, selectedImageIds = []) {
    return apiCall(async () => {
        const response = await fetch(`${API_BASE}/generate/modify/${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                modificationPrompt,
                selectedImageIds: selectedImageIds.length > 0 ? selectedImageIds : undefined,
            }),
        });

        return handleApiResponse(response, 'Failed to modify images');
    });
}

export async function getSession(sessionId) {
    return apiCall(async () => {
        const response = await fetch(`${API_BASE}/generate/session/${sessionId}`);
        return handleApiResponse(response, 'Session not found');
    });
}

export async function getAllSessions(limit = 50, skip = 0) {
    return apiCall(async () => {
        const response = await fetch(`${API_BASE}/generate/sessions?limit=${limit}&skip=${skip}`);
        return handleApiResponse(response, 'Failed to fetch sessions');
    });
}
