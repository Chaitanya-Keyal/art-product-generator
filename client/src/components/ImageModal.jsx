function ImageModal({ image, onClose }) {
    if (!image) return null;

    return (
        <div className="image-modal" onClick={onClose}>
            <img src={image} alt="Full size preview" />
            <button className="image-modal-close" onClick={onClose}>
                ×
            </button>
            <a
                href={image}
                download
                className="image-modal-download"
                onClick={(e) => e.stopPropagation()}
            >
                Download
            </a>
        </div>
    );
}

export default ImageModal;
