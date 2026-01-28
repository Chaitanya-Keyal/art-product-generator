import { useState, useEffect, useCallback } from 'react';
import { getAllSessions } from '../api';
import { formatDate } from '../utils/date-formatter';
import ImageModal from './ImageModal';
import TurnList from './TurnList';

function Gallery({ onClose, onSelectSession }) {
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

    const renderSessionImages = (session) => {
        return (
            <TurnList
                turns={session.turns}
                onImageClick={setSelectedImage}
                altPrefix={session.productType}
                expandedTurns={expandedSessions}
                onToggleTurn={(key) =>
                    setExpandedSessions((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                    }))
                }
                expandKeyPrefix={session.sessionId}
            />
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
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                        }}
                                    >
                                        <span className="gallery-session-date">
                                            {formatDate(session.createdAt)}
                                        </span>
                                        {onSelectSession && (
                                            <button
                                                className="btn btn-primary"
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    fontSize: '0.875rem',
                                                }}
                                                onClick={() => onSelectSession(session.sessionId)}
                                            >
                                                Open
                                            </button>
                                        )}
                                    </div>
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
