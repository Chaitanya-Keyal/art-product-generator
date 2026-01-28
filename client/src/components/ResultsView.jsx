import { useState, useEffect } from 'react';
import { countWithLabel } from '../utils/text';
import ImageModal from './ImageModal';
import TurnList from './TurnList';
import { estimateModificationCost } from '../api';
import CostEstimate from './CostEstimate';

const MODIFICATION_SUGGESTIONS = [
    'Make the colors more vibrant',
    'Add more intricate patterns',
    'Make the design more minimalist',
    'Change the background color',
    'Add a border around the design',
    'Make it look more traditional',
];

function ResultsView({
    images,
    artForm,
    productType,
    history,
    onModify,
    onReset,
    generating,
    sessionId,
}) {
    const [modificationPrompt, setModificationPrompt] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedTurns, setExpandedTurns] = useState({});
    const [costEstimate, setCostEstimate] = useState(null);
    const [loadingCost, setLoadingCost] = useState(false);

    const modelResponses = history
        .map((entry, idx) => ({ ...entry, turnIndex: idx }))
        .filter((entry) => entry.role === 'model' && entry.images?.length > 0);

    // Convert to turns structure for TurnList (sorted newest first)
    const turns = modelResponses
        .map((response) => ({
            turn: response.turn ?? response.turnIndex,
            images: response.images,
            errors: response.errors,
        }))
        .reverse();

    const latestResponse = modelResponses[modelResponses.length - 1];

    const getImageId = (image) => {
        // Images are now { id, url } objects
        return image.id;
    };

    const handleModifySubmit = (e) => {
        e.preventDefault();
        if (modificationPrompt.trim()) {
            onModify(modificationPrompt.trim(), Array.from(selectedIds));
            setModificationPrompt('');
            setSelectedIds(new Set());
        }
    };

    const toggleImageSelection = (image) => {
        const imageId = getImageId(image);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(imageId)) {
                next.delete(imageId);
            } else if (next.size < 4) {
                next.add(imageId);
            }
            return next;
        });
    };

    // Debounce cost estimation for modifications
    useEffect(() => {
        if (!sessionId || !modificationPrompt.trim()) {
            setCostEstimate(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setLoadingCost(true);
            try {
                const result = await estimateModificationCost(
                    sessionId,
                    modificationPrompt.trim(),
                    Array.from(selectedIds)
                );
                setCostEstimate(result);
            } catch (error) {
                console.error('Failed to estimate cost:', error);
                setCostEstimate(null);
            } finally {
                setLoadingCost(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [sessionId, modificationPrompt, selectedIds]);

    return (
        <div>
            <div className="card">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '1rem',
                    }}
                >
                    <div>
                        <div className="art-form-badge">{artForm?.name || 'Art Form'}</div>
                        <h2 className="card-title" style={{ marginBottom: '0.5rem' }}>
                            {productType} Designs
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {countWithLabel(images.length, 'image')} generated
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={onReset} disabled={generating}>
                        Start New
                    </button>
                </div>

                {latestResponse?.errors && latestResponse.errors.length > 0 && (
                    <div
                        style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.05)',
                            borderRadius: '8px',
                            borderLeft: '3px solid #ef4444',
                        }}
                    >
                        <p
                            style={{
                                fontSize: '0.875rem',
                                color: '#ef4444',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                            }}
                        >
                            Generation Errors:
                        </p>
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: '1.5rem',
                                color: 'var(--text-primary)',
                            }}
                        >
                            {latestResponse.errors.map((err, idx) => (
                                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                    Request {err.index}: {err.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {generating && (
                <div className="card">
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p className="loading-text">
                            Generating designs...
                            <br />
                            <small>This usually takes 30-60 seconds</small>
                        </p>
                    </div>
                </div>
            )}

            {latestResponse && turns.length > 0 && (
                <div className="card">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                        }}
                    >
                        <h3 className="card-title" style={{ margin: 0 }}>
                            {turns.length > 1 ? 'Latest Results' : 'Generated Images'}
                        </h3>
                        {selectedIds.size > 0 && (
                            <span
                                style={{
                                    fontSize: '0.875rem',
                                    color: 'var(--primary)',
                                    fontWeight: '600',
                                }}
                            >
                                {selectedIds.size} selected
                            </span>
                        )}
                    </div>
                    <p
                        style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '1rem',
                        }}
                    >
                        Click images to select for modification (max 4)
                    </p>
                    <TurnList
                        turns={turns}
                        onImageClick={setSelectedImage}
                        altPrefix={`${productType} with ${artForm?.name} design`}
                        expandedTurns={expandedTurns}
                        onToggleTurn={(key) =>
                            setExpandedTurns((prev) => ({
                                ...prev,
                                [key]: !prev[key],
                            }))
                        }
                        useImageGrid={true}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleImageSelection}
                        getImageId={getImageId}
                    />
                </div>
            )}

            {!generating && latestResponse && (
                <div className="card">
                    <h3 className="card-title">Refine Your Design</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        {selectedIds.size > 0
                            ? `Modifying ${countWithLabel(selectedIds.size, 'image')}`
                            : 'Select images to modify, or describe changes for all images'}
                    </p>

                    <form onSubmit={handleModifySubmit}>
                        <div className="modify-input-wrapper">
                            <input
                                type="text"
                                className="form-input"
                                value={modificationPrompt}
                                onChange={(e) => setModificationPrompt(e.target.value)}
                                placeholder="e.g., Make the colors more vibrant, add more detail..."
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={!modificationPrompt.trim() || generating}
                            >
                                {selectedIds.size > 0 ? 'Modify Selected' : 'Modify All'}
                            </button>
                        </div>
                    </form>

                    <CostEstimate
                        costEstimate={costEstimate}
                        loading={loadingCost}
                        header={
                            costEstimate
                                ? `Estimated Cost (${costEstimate.imagesBeingModified} ${costEstimate.imagesBeingModified === 1 ? 'image' : 'images'}):`
                                : undefined
                        }
                    />

                    <div style={{ marginTop: '1rem' }}>
                        <p
                            style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Quick suggestions:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {MODIFICATION_SUGGESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    className="btn-secondary"
                                    style={{
                                        padding: '0.25rem 0.75rem',
                                        fontSize: '0.75rem',
                                        borderRadius: '20px',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setModificationPrompt(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />
        </div>
    );
}

export default ResultsView;
