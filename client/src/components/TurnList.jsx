import Collapsible from './Collapsible';
import ImageGrid from './ImageGrid';
import { countWithLabel } from '../utils/text';

/**
 * Renders a list of turns with the latest expanded and previous turns collapsible
 * @param {Array} turns - Array of turn objects sorted newest first
 * @param {Function} onImageClick - Callback when image is clicked
 * @param {string} altPrefix - Prefix for image alt text
 * @param {Object} expandedTurns - Object tracking which turns are expanded
 * @param {Function} onToggleTurn - Callback to toggle turn expansion
 * @param {string} expandKeyPrefix - Prefix for expansion keys (e.g., sessionId)
 * @param {boolean} useImageGrid - If true, use ImageGrid component (for selection), else simple gallery grid
 * @param {Set} selectedIds - Selected image IDs (only used with ImageGrid)
 * @param {Function} onToggleSelect - Toggle selection callback (only used with ImageGrid)
 * @param {Function} getImageId - Get image ID from URL (only used with ImageGrid)
 */
function TurnList({
    turns,
    onImageClick,
    altPrefix,
    expandedTurns = {},
    onToggleTurn,
    expandKeyPrefix = '',
    useImageGrid = false,
    selectedIds,
    onToggleSelect,
    getImageId,
}) {
    if (!turns || turns.length === 0) {
        return null;
    }

    const latestTurn = turns[0];
    const previousTurns = turns.slice(1);

    const renderImages = (images, alt) => {
        if (useImageGrid) {
            return (
                <ImageGrid
                    images={images}
                    onImageClick={onImageClick}
                    selectedIds={selectedIds}
                    onToggleSelect={onToggleSelect}
                    getImageId={getImageId}
                    altPrefix={alt}
                />
            );
        }

        return (
            <div className="gallery-grid">
                {images.map((image, idx) => (
                    <div
                        key={idx}
                        className="gallery-image-card"
                        onClick={() => onImageClick(image)}
                    >
                        <img src={image} alt={`${alt} ${idx + 1}`} loading="lazy" />
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            {/* Latest turn - always expanded */}
            {renderImages(latestTurn.images, `${altPrefix} - Latest`)}

            {/* Previous turns - collapsible */}
            {previousTurns.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    {previousTurns.map((turn) => {
                        const expandKey = expandKeyPrefix
                            ? `${expandKeyPrefix}-${turn.turn}`
                            : turn.turn;

                        return (
                            <div key={turn.turn} style={{ marginBottom: '0.5rem' }}>
                                <Collapsible
                                    title={`Turn ${turn.turn + 1} - ${countWithLabel(turn.images.length, 'image')}`}
                                    isExpanded={expandedTurns[expandKey]}
                                    onToggle={() => onToggleTurn(expandKey)}
                                    variant="compact"
                                >
                                    {renderImages(
                                        turn.images,
                                        `${altPrefix} - Turn ${turn.turn + 1}`
                                    )}
                                </Collapsible>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

export default TurnList;
