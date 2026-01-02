// NotificationContext.js
import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (id, title, message, type = 'info') => {
        const uniqueId = `${id}-${Date.now()}`;
        setNotifications(prev => [...prev, { id: uniqueId, title, message, type }]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== uniqueId));
        }, 3000);
    };

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}

            <div className="fixed top-5 right-5 flex flex-col space-y-3 z-50">
                {notifications.map(({ id, title, message, type }) => (
                    <div
                        key={id}
                        className={`px-4 py-3 rounded shadow text-white animate-slide-in max-w-xs break-words bg-black bg-opacity-40 backdrop-blur-sm ${
                            type === 'success' ? 'border border-green-500' :
                            type === 'error' ? 'border border-red-500' :
                            'border border-blue-500'
                        }`}
                    >
                        <strong className="block font-semibold">{title}</strong>
                        <span>{message}</span>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
