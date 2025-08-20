'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ToastType = 'info' | 'warning' | 'error' | 'success';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Simple toast system - in a real app, you'd use a proper toast library
const Toast = ({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    success: 'bg-green-500',
  }[type];

  return (
    <div className={`${bgColor} text-white p-4 rounded-md shadow-lg flex justify-between items-center`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
        &times;
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) => {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

export default function SessionWatcher() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (lastStatus === 'authenticated' && status === 'unauthenticated') {
      addToast(
        'Your session has expired. Please check your environment variables and OAuth callback URLs.',
        'warning'
      );
      console.warn(
        'Session expired unexpectedly. Check NEXTAUTH_URL and NEXTAUTH_SECRET in your .env file, and ensure your OAuth callback URLs are correct.'
      );
    }
    setLastStatus(status);
  }, [status, lastStatus]);

  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
}
