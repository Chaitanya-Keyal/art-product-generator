import { useState } from 'react';
import { formatTime } from '../utils/date-formatter';
import { countWithLabel } from '../utils/text';
import ImageModal from './ImageModal';
import ImageGrid from './ImageGrid';
import Collapsible from './Collapsible';

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
    currentText,
    history,
    onModify,
    onReset,
    generating,
}) {
    const [modificationPrompt, setModificationPrompt] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedTurns, setExpandedTurns] = useState({});

    const modelResponses = history
        .map((entry, idx) => ({ ...entry, turnIndex: idx }))
        .filter((entry) => entry.role === 'model' && entry.images?.length > 0);

    const latestResponse = modelResponses[modelResponses.length - 1];
    const previousResponses = modelResponses.slice(0, -1);

    const getImageId = (imageUrl) => {
        const match = imageUrl.match(/uploads\/[^/]+$/);
        return match ? match[0] : imageUrl;
    };

    const handleModifySubmit = (e) => {
        e.preventDefault();
        if (modificationPrompt.trim()) {
            onModify(modificationPrompt.trim(), Array.from(selectedIds));
            setModificationPrompt('');
            setSelectedIds(new Set());
        }
    };

    const toggleImageSelection = (imageUrl) => {
        const imageId = getImageId(imageUrl);
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

                {currentText && (
                    <div
                        style={{
                            marginTop: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(139, 92, 246, 0.05)',
                            borderRadius: '8px',
                            borderLeft: '3px solid var(--primary)',
                        }}
                    >
                        <p
                            style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '0.5rem',
                                fontWeight: '600',
                            }}
                        >
                            AI Response:
                        </p>
                        <p style={{ color: 'var(--text-primary)', lineHeight: '1.6', margin: 0 }}>
                            {currentText}
                        </p>
                    </div>
                )}

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

            {latestResponse && (
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
                            Latest Results
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
                    <ImageGrid
                        images={latestResponse.images}
                        onImageClick={setSelectedImage}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleImageSelection}
                        getImageId={getImageId}
                        altPrefix={`${productType} with ${artForm?.name} design`}
                    />
                </div>
            )}

            {previousResponses.length > 0 && (
                <div className="card">
                    <h3 className="card-title">Previous Generations</h3>
                    {previousResponses.map((response, idx) => (
                        <div
                            key={idx}
                            style={{
                                marginBottom: idx < previousResponses.length - 1 ? '1rem' : 0,
                            }}
                        >
                            <Collapsible
                                title={
                                    <>
                                        Turn {idx + 1} -{' '}
                                        {countWithLabel(response.images.length, 'image')}
                                        <span
                                            style={{
                                                color: 'var(--text-secondary)',
                                                marginLeft: '0.5rem',
                                                fontSize: '0.875rem',
                                            }}
                                        >
                                            {formatTime(response.timestamp)}
                                        </span>
                                    </>
                                }
                                isExpanded={expandedTurns[idx]}
                                onToggle={() =>
                                    setExpandedTurns((prev) => ({ ...prev, [idx]: !prev[idx] }))
                                }
                            >
                                {response.text && (
                                    <p
                                        style={{
                                            fontSize: '0.875rem',
                                            color: 'var(--text-secondary)',
                                            marginBottom: '1rem',
                                        }}
                                    >
                                        {response.text}
                                    </p>
                                )}
                                <ImageGrid
                                    images={response.images}
                                    onImageClick={setSelectedImage}
                                    selectedIds={selectedIds}
                                    onToggleSelect={toggleImageSelection}
                                    getImageId={getImageId}
                                    altPrefix={`${productType} with ${artForm?.name} design`}
                                />
                            </Collapsible>
                        </div>
                    ))}
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
