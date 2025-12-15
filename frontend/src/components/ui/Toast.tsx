import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'blue';
    onClose: () => void;
    position?: 'fixed-top' | 'fixed-bottom' | 'static';
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
    message,
    type,
    onClose,
    duration = 3000,
    position = 'fixed-top'
}) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const getToastStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-green-50 text-green-800 border border-green-200';
            case 'error':
                return 'bg-red-50 text-red-800 border border-red-200';
            case 'blue':
                return 'bg-blue-50 text-blue-800 border border-blue-200';
            default:
                return 'bg-gray-50 text-gray-800 border border-gray-200';
        }
    };

    const getPositionStyles = () => {
        switch (position) {
            case 'fixed-top':
                return 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50';
            case 'fixed-bottom':
                return 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50';
            case 'static':
                return 'w-full mb-4'; // Full width and margin bottom for inline use
            default:
                return 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={20} className="text-green-500" />;
            case 'error':
                return <XCircle size={20} className="text-red-500" />;
            case 'blue':
                return <XCircle size={20} className="text-blue-500" />;
            default:
                return null;
        }
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${getPositionStyles()} ${getToastStyles()}`}>
            {getIcon()}

            <p className="text-sm font-medium pr-2">{message}</p>

            <button
                onClick={onClose}
                className={`p-1 rounded-full hover:bg-black/5 transition-colors ${type === 'success' ? 'text-green-500' : type === 'blue' ? 'text-blue-500' : 'text-red-500'}`}
            >
                <X size={16} />
            </button>
        </div>
    );
};
