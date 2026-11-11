export type ToastType = "info" | "success" | "warn" | "danger";

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type?: ToastType;
}

type ToastListener = (toast: ToastMessage) => void;

const listeners: Set<ToastListener> = new Set();

export function showToast(message: string, type: ToastType = "info", title?: string) {
  const toast: ToastMessage = {
    id: `${Date.now()}-${Math.random()}`,
    title,
    message,
    type,
  };
  listeners.forEach((fn) => fn(toast));
}

export function subscribeToast(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
