export async function handleApiResponse(response, defaultErrorMessage) {
    if (!response.ok) {
        let errorMessage = defaultErrorMessage;
        try {
            const error = await response.json();
            if (response.status === 404) {
                errorMessage = 'Session expired. Please start a new generation.';
            } else {
                errorMessage = error.error || error.details || errorMessage;
            }
        } catch (_e) {
            errorMessage = `${errorMessage} (${response.status}: ${response.statusText})`;
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

export async function apiCall(fetchFn) {
    try {
        return await fetchFn();
    } catch (error) {
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
            throw new Error('Unable to connect to server. Please check your internet connection.');
        }
        throw error;
    }
}
