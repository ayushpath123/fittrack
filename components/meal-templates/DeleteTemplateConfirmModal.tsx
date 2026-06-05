"use client";

import { Button } from "@/components/ui/Button";

type DeleteTemplateConfirmModalProps = {
  open: boolean;
  templateName?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
};

export function DeleteTemplateConfirmModal({
  open,
  templateName,
  onCancel,
  onConfirm,
  isDeleting = false,
}: DeleteTemplateConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-template-title"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[rgba(12,14,22,.98)] p-5 shadow-2xl"
      >
        <h2 id="delete-template-title" className="text-base font-semibold text-[var(--white)]">
          Delete Template?
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {templateName ? `"${templateName}" will be permanently removed.` : "This action cannot be undone."}
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            className="flex-1 !bg-red-500/90 hover:!bg-red-500"
            onClick={() => void onConfirm()}
            isLoading={isDeleting}
            loadingText="Deleting…"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
