import { useState, useEffect } from 'react';
import GenerationForm from './components/GenerationForm';
import ResultsView from './components/ResultsView';
import Gallery from './components/Gallery';
import Toast from './components/Toast';
import { fetchArtForms, generateImages, modifyImages, getSession } from './api';
import { buildAssistantHistoryEntry } from './utils/history-builder';

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

            setSessionHistory([
                buildAssistantHistoryEntry(result.images, result.errors, result.turn),
            ]);

            if (result.errors && result.errors.length > 0) {
                const errorCount = result.errors.length;
                const successCount = result.images.length;
                showToast(`Generated ${successCount} images, ${errorCount} failed`, 'warning');
            } else {
                showToast('Images generated successfully!', 'success');
            }
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

            setSessionHistory((prev) => [
                ...prev,
                buildAssistantHistoryEntry(result.images, result.errors, result.turn),
            ]);

            if (result.errors && result.errors.length > 0) {
                const errorCount = result.errors.length;
                const successCount = result.images.length;
                showToast(`Modified ${successCount} images, ${errorCount} failed`, 'warning');
            } else {
                showToast('Images modified successfully!', 'success');
            }
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
        setError(null);
        showToast('Starting new generation', 'info');
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 4000);
    };

    const handleSelectSession = async (selectedSessionId) => {
        setShowGallery(false);
        setError(null);

        try {
            const session = await getSession(selectedSessionId);
            const artForm = artForms.find((af) => af.key === session.artForm);

            // Flatten all images from turns
            const allImages = session.turns.flatMap((t) => t.images);

            setSessionId(session.sessionId);
            setGeneratedImages(allImages);
            setCurrentArtForm(artForm);
            setCurrentProduct(session.productType);

            // Build history entries from turns (server returns newest first, reverse for chronological)
            const history = session.turns
                .slice()
                .reverse()
                .map((t) => buildAssistantHistoryEntry(t.images, null, t.turn));

            setSessionHistory(history);

            showToast('Session loaded successfully', 'success');
        } catch (err) {
            const errorMsg = err.message || 'Failed to load session';
            setError(errorMsg);
            showToast(errorMsg, 'error');
            console.error(err);
        }
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
                    history={sessionHistory}
                    onModify={handleModify}
                    onReset={handleReset}
                    generating={generating}
                    sessionId={sessionId}
                />
            )}

            {showGallery && (
                <Gallery
                    onClose={() => setShowGallery(false)}
                    onSelectSession={handleSelectSession}
                />
            )}

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}

export default App;
