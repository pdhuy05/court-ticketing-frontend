"use client";

import React, { useEffect, useRef } from "react";
import "@/styles/confirm-modal.css";

interface ConfirmField {
  label: string;
  value: string;
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  fields?: ConfirmField[];
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  fields,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const hasFields = fields && fields.length > 0;

  useEffect(() => {
    if (!dialogRef.current) return;
    if (isOpen) {
      dialogRef.current.classList.add("cm-dialog--in");
    } else {
      dialogRef.current.classList.remove("cm-dialog--in");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="cm-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="cm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="cm-close" onClick={onCancel} aria-label="Đóng">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="cm-icon-wrap">
          <div className="cm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        <div className="cm-content">
          {/* cm-title--simple tightens gap when there are no fields */}
          <h2 className={hasFields ? "cm-title" : "cm-title cm-title--simple"}>
            {title}
          </h2>

          {hasFields && (
            <div className="cm-fields">
              {fields.map((field, i) => (
                <div className="cm-field-row" key={i}>
                  <span className="cm-field-label">{field.label}</span>
                  <span className="cm-field-value">{field.value}</span>
                </div>
              ))}
            </div>
          )}

          {message && <p className="cm-message">{message}</p>}
        </div>

        <div className="cm-actions">
          <button className="cm-btn cm-btn--cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="cm-btn cm-btn--confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}