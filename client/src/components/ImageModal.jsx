import { Download, X } from 'lucide-react';

function ImageModal({ image, onClose }) {
    if (!image) return null;

    return (
        <div className="image-modal" onClick={onClose}>
            <img src={image} alt="Full size preview" />
            <button className="image-modal-close" onClick={onClose} aria-label="Close">
                <X size={24} strokeWidth={2.5} />
            </button>
            <a
                href={image}
                download
                className="image-modal-download"
                onClick={(e) => e.stopPropagation()}
            >
                <Download size={18} strokeWidth={2.5} />
                Download
            </a>
        </div>
    );
}

export default ImageModal;
