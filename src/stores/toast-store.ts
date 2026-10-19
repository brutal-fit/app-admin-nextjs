import { create } from "zustand";

export type ToastTone = "success" | "error" | "info";
export type ToastItem = { id: number; tone: ToastTone; message: string };

type ToastState = {
  toasts: ToastItem[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

// UI state only, written from client event handlers, so a module store is safe here.
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (tone, message) =>
    set((state) => ({ toasts: [...state.toasts, { id: nextId++, tone, message }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function showToast(tone: ToastTone, message: string): void {
  useToastStore.getState().push(tone, message);
}
