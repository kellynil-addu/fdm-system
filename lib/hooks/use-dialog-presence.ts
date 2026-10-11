'use client';

import { useState, useEffect } from 'react';

export const DIALOG_EXIT_MS = 200;

export function useDialogPresence<T>(activeDialog: T | null, exitMs: number = DIALOG_EXIT_MS) {
  const [rendered, setRendered] = useState<T | null>(activeDialog);

  // Synchronously update rendered when opening a new dialog to avoid frame delay.
  if (activeDialog && rendered !== activeDialog) {
    setRendered(activeDialog);
  }

  // Keep dialog mounted until exit animation finishes.
  useEffect(() => {
    if (!activeDialog && rendered) {
      const timer = setTimeout(() => setRendered(null), exitMs);
      return () => clearTimeout(timer);
    }
  }, [activeDialog, rendered, exitMs]);

  return { rendered, isOpen: activeDialog !== null };
}
