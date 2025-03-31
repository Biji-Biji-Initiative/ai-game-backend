import React from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface NotificationsProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ notifications, onRemove }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-md">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`flex justify-between items-center p-4 rounded shadow-md w-full box-border animate-slideIn
            ${notification.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-base
                ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
            >
              {notification.type === 'success' ? '✓' : '✕'}
            </span>
            <span className="text-gray-800 text-sm">{notification.message}</span>
          </div>
          <button
            className="bg-transparent border-none text-gray-500 text-xl cursor-pointer p-0 ml-2.5 hover:text-gray-700"
            onClick={() => onRemove(notification.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Notifications;
