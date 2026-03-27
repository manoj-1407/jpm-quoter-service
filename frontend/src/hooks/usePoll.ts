import { useState, useEffect, useCallback } from 'react';

export function usePoll<T>(
  fn: () => Promise<T>,
  interval = 2000,
  initial: T | null = null,
) {
  const [data,    setData]    = useState<T | null>(initial);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const run = useCallback(async () => {
    try {
      const r = await fn();
      setData(r); setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }, [fn]);

  useEffect(() => {
    run();
    const id = setInterval(run, interval);
    return () => clearInterval(id);
  }, [run, interval]);

  return { data, loading, error, refresh: run };
}
