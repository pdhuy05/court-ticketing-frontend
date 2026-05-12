import React from "react";
import Toast from "./Toast";
import { Toast as ToastType } from "@/hooks/useToast";

interface ToastContainerProps {
  toasts: ToastType[];
  onRemoveToast: (id: string) => void;
}

export default function ToastContainer({
  toasts,
  onRemoveToast,
}: ToastContainerProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        display: "grid",
        gap: 14,
        width: "min(520px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: "auto",
          }}
        >
          <Toast
            isOpen={true}
            message={toast.message}
            type={toast.type}
            onClose={() => onRemoveToast(toast.id)}
            duration={0}
            inline
          />
        </div>
      ))}
    </div>
  );
}
