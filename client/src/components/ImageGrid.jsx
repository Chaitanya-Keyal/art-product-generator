function ImageGrid({
    images,
    onImageClick,
    selectedIds = null,
    onToggleSelect = null,
    getImageId = (img) => img,
    altPrefix = 'Image',
    className = 'image-grid',
}) {
    const isSelectable = selectedIds !== null && onToggleSelect !== null;

    return (
        <div className={className}>
            {images.map((image, index) => {
                const imageId = getImageId(image);
                const isSelected = isSelectable && selectedIds.has(imageId);

                return (
                    <div
                        key={`${imageId}-${index}`}
                        className={`image-card ${isSelected ? 'image-selected' : ''}`}
                    >
                        {isSelectable && (
                            <div className="image-checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    className="image-checkbox"
                                    checked={isSelected}
                                    onChange={() => onToggleSelect(image)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                        <img
                            src={image}
                            alt={`${altPrefix} ${index + 1}`}
                            loading="lazy"
                            onClick={() => onImageClick(image)}
                            style={{ cursor: 'pointer' }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

export default ImageGrid;
