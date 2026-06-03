"use client";

import ConfirmModal from "@/components/ConfirmModal";

interface AdminConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AdminConfirmDialog(props: AdminConfirmDialogProps) {
  return <ConfirmModal {...props} />;
}