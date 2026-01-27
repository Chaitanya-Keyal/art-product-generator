import { useState, useEffect, useCallback } from 'react';
import { getAllSessions } from '../api';
import { formatDate } from '../utils/date-formatter';
import { countWithLabel } from '../utils/text';
import ImageModal from './ImageModal';
import Collapsible from './Collapsible';

function Gallery({ onClose }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [expandedSessions, setExpandedSessions] = useState({});

    const loadSessions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getAllSessions(100, 0);
            setSessions(result.sessions);
        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const renderImageGrid = (images, altPrefix) => (
        <div className="gallery-grid">
            {images.map((image, idx) => (
                <div
                    key={idx}
                    className="gallery-image-card"
                    onClick={() => setSelectedImage(image)}
                >
                    <img src={image} alt={`${altPrefix} ${idx + 1}`} loading="lazy" />
                </div>
            ))}
        </div>
    );

    const renderSessionImages = (session) => {
        const turns = session.turns || [];
        if (turns.length === 0) {
            return renderImageGrid(session.images, session.productType);
        }

        const latestTurn = turns[turns.length - 1];
        const previousTurns = turns.slice(0, -1);
        const previousImageCount = previousTurns.reduce((sum, t) => sum + t.images.length, 0);

        return (
            <>
                {renderImageGrid(latestTurn.images, `${session.productType} - Latest`)}

                {previousTurns.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                        <Collapsible
                            title={countWithLabel(previousImageCount, 'previous image')}
                            isExpanded={expandedSessions[session.sessionId]}
                            onToggle={() =>
                                setExpandedSessions((prev) => ({
                                    ...prev,
                                    [session.sessionId]: !prev[session.sessionId],
                                }))
                            }
                            variant="compact"
                        >
                            {renderImageGrid(
                                previousTurns.flatMap((t) => t.images),
                                `${session.productType} - Previous`
                            )}
                        </Collapsible>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="gallery-overlay" onClick={onClose}>
            <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
                <div className="gallery-header">
                    <h2>All Generated Images</h2>
                    <button className="gallery-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                {loading && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p className="loading-text">Loading gallery...</p>
                    </div>
                )}

                {error && <div className="error-message">{error}</div>}

                {!loading && !error && sessions.length === 0 && (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                            No images generated yet. Create your first design!
                        </p>
                    </div>
                )}

                {!loading && !error && sessions.length > 0 && (
                    <div className="gallery-content">
                        {sessions.map((session) => (
                            <div key={session.sessionId} className="gallery-session">
                                <div className="gallery-session-header">
                                    <div>
                                        <span className="gallery-session-badge">
                                            {session.artForm}
                                        </span>
                                        <h3 className="gallery-session-title">
                                            {session.productType}
                                        </h3>
                                    </div>
                                    <span className="gallery-session-date">
                                        {formatDate(session.createdAt)}
                                    </span>
                                </div>
                                {renderSessionImages(session)}
                            </div>
                        ))}
                    </div>
                )}

                <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />
            </div>
        </div>
    );
}

export default Gallery;
