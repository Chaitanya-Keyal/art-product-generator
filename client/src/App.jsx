import { useState, useEffect } from 'react';
import GenerationForm from './components/GenerationForm';
import ResultsView from './components/ResultsView';
import Gallery from './components/Gallery';
import Toast from './components/Toast';
import { fetchArtForms, generateImages, modifyImages } from './api';
import {
    buildUserHistoryEntry,
    buildAssistantHistoryEntry,
    buildGenerationPrompt,
} from './utils/history-builder';

function App() {
    const [artForms, setArtForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [showGallery, setShowGallery] = useState(false);

    const [sessionId, setSessionId] = useState(null);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [currentArtForm, setCurrentArtForm] = useState(null);
    const [currentProduct, setCurrentProduct] = useState('');
    const [sessionHistory, setSessionHistory] = useState([]);
    const [currentText, setCurrentText] = useState('');

    useEffect(() => {
        async function loadArtForms() {
            setLoading(true);
            setError(null);
            try {
                const forms = await fetchArtForms();
                setArtForms(forms);
            } catch (err) {
                const errorMsg = 'Failed to load art forms. Please refresh the page.';
                setError(errorMsg);
                showToast(errorMsg, 'error');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadArtForms();
    }, []);

    const handleGenerate = async (formData) => {
        setGenerating(true);
        setError(null);

        try {
            const result = await generateImages(formData);
            setSessionId(result.sessionId);
            setGeneratedImages(result.images);
            setCurrentArtForm(artForms.find((af) => af.key === formData.artFormKey));
            setCurrentProduct(formData.productType);
            setCurrentText(result.text || '');

            const timestamp = new Date();
            const userPrompt = buildGenerationPrompt(
                formData.artFormKey,
                formData.productType,
                formData.additionalInstructions
            );

            setSessionHistory([
                buildUserHistoryEntry(userPrompt, timestamp),
                buildAssistantHistoryEntry(result.text, result.images, timestamp),
            ]);

            showToast('Images generated successfully!', 'success');
        } catch (err) {
            const errorMsg = err.message || 'Failed to generate images. Please try again.';
            setError(errorMsg);
            showToast(errorMsg, 'error');
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const handleModify = async (modificationPrompt, selectedImageIds = []) => {
        if (!sessionId) return;

        setGenerating(true);
        setError(null);

        try {
            const result = await modifyImages(sessionId, modificationPrompt, selectedImageIds);
            setGeneratedImages((prev) => [...prev, ...result.images]);
            setCurrentText(result.text || '');

            const timestamp = new Date();
            setSessionHistory((prev) => [
                ...prev,
                buildUserHistoryEntry(modificationPrompt, timestamp, selectedImageIds),
                buildAssistantHistoryEntry(result.text, result.images, timestamp),
            ]);

            showToast('Images modified successfully!', 'success');
        } catch (err) {
            const errorMsg = err.message || 'Failed to modify images. Please try again.';
            setError(errorMsg);
            showToast(errorMsg, 'error');
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const handleReset = () => {
        setSessionId(null);
        setGeneratedImages([]);
        setCurrentArtForm(null);
        setCurrentProduct('');
        setSessionHistory([]);
        setCurrentText('');
        setError(null);
        showToast('Starting new generation', 'info');
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    return (
        <div className="app">
            <header className="header">
                <h1>Art Product Generator</h1>
                <p>Transform your products with beautiful Indian art forms</p>
                <button
                    className="btn btn-secondary gallery-button"
                    onClick={() => setShowGallery(true)}
                >
                    View Gallery
                </button>
            </header>

            {error && (
                <div className="error-message">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {loading ? (
                <div className="card">
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p className="loading-text">Loading art forms...</p>
                    </div>
                </div>
            ) : !sessionId ? (
                <GenerationForm
                    artForms={artForms}
                    onGenerate={handleGenerate}
                    generating={generating}
                />
            ) : (
                <ResultsView
                    images={generatedImages}
                    artForm={currentArtForm}
                    productType={currentProduct}
                    currentText={currentText}
                    history={sessionHistory}
                    onModify={handleModify}
                    onReset={handleReset}
                    generating={generating}
                />
            )}

            {showGallery && <Gallery onClose={() => setShowGallery(false)} />}

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}

export default App;
