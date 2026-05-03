import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((type, message) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div id="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast ${t.type}`} style={{ animation: 'slideIn 0.3s ease forwards' }}>
                        <i className={`fa-solid ${t.type === 'success' ? 'fa-check-circle' : 'fa-circle-xmark'}`}></i>
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
