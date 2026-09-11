'use client';

import { useState } from 'react';

export type MutationState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success' }
  | { status: 'error'; error: string };

export function useMutation<TArgs extends unknown[], TResult = void>(
  mutationFn: (...args: TArgs) => Promise<TResult>
) {
  const [state, setState] = useState<MutationState>({ status: 'idle' });

  async function execute(...args: TArgs): Promise<boolean> {
    setState({ status: 'pending' });
    try {
      await mutationFn(...args);
      setState({ status: 'success' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setState({ status: 'error', error: message });
      return false;
    }
  }

  function reset() {
    setState({ status: 'idle' });
  }

  return { state, execute, reset };
}
