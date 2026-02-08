import { useState, useCallback } from "react";

/**
 * Hook for managing a custom in-panel confirmation dialog.
 *
 * Usage:
 *   const { confirmState, requestConfirm, closeConfirm } = useConfirm();
 *   requestConfirm("Are you sure?", () => { doSomething(); });
 *
 * Render <ConfirmDialog {...confirmState} onCancel={closeConfirm} /> in JSX.
 */
export function useConfirm() {
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: "",
    onConfirm: null,
  });

  const requestConfirm = useCallback((message, onConfirm) => {
    setConfirmState({ open: true, message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmState({ open: false, message: "", onConfirm: null });
  }, []);

  return { confirmState, requestConfirm, closeConfirm };
}
