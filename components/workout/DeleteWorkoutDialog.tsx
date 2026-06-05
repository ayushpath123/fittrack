"use client";

import { Button } from "@/components/ui/Button";

type DeleteWorkoutDialogProps = {
  open: boolean;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteWorkoutDialog({ open, isDeleting, onCancel, onConfirm }: DeleteWorkoutDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1C1C2C] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[var(--white)]">Delete Workout?</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">This action cannot be undone.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            isLoading={isDeleting}
            loadingText="Deleting..."
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
