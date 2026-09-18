import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { NotificationPayload } from '../types/notification.types';
import './NotificationToast.css';

const TOAST_DURATION_MS = 5000;

function getSocketUrl(): string {
    if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
    return import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
}

export default function NotificationToast({ token }: { token: string | null }) {
    const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

    useEffect(() => {
        if (!token) return;

        const socket: Socket = io(getSocketUrl(), {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        function handleNotification(notification: NotificationPayload) {
            setNotifications((current) => [notification, ...current].slice(0, 4));
            window.setTimeout(() => {
                setNotifications((current) => current.filter((item) => item.id !== notification.id));
            }, TOAST_DURATION_MS);
        }

        socket.on('notification', handleNotification);
        return () => {
            socket.off('notification', handleNotification);
            socket.disconnect();
        };
    }, [token]);

    function dismiss(id: string) {
        setNotifications((current) => current.filter((notification) => notification.id !== id));
    }

    return (
        <div className="notification-toasts" aria-live="polite" aria-label="Thông báo hệ thống">
            {notifications.map((notification) => (
                <div className="notification-toast" key={notification.id}>
                    <div className="notification-toast__indicator" />
                    <div className="notification-toast__content">
                        <strong>Thông báo</strong>
                        <span>{notification.message}</span>
                    </div>
                    <button
                        type="button"
                        className="notification-toast__close"
                        onClick={() => dismiss(notification.id)}
                        aria-label="Đóng thông báo"
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
