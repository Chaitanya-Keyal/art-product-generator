import { useEffect } from 'react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

const iconMap = {
    success: Check,
    error: X,
    info: Info,
    warning: AlertTriangle,
};

function Toast({ message, type = 'info', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const IconComponent = iconMap[type] || Info;

    return (
        <div className={`toast toast-${type}`}>
            <span className="toast-icon" aria-hidden="true">
                <IconComponent size={20} strokeWidth={2.5} />
            </span>
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={onClose} aria-label="Close">
                <X size={20} strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default Toast;
