import { useState, useEffect } from 'react';
import { checkMlHealth, checkBackendHealth } from '../api/predictionApi';

export function useHealth() {
  const [mlStatus, setMlStatus] = useState({ checking: true, ok: false, version: null });
  const [backendStatus, setBackendStatus] = useState({ checking: true, ok: false });

  useEffect(() => {
    let mounted = true;

    async function probe() {
      const [ml, backend] = await Promise.all([
        checkMlHealth(),
        checkBackendHealth(),
      ]);

      if (mounted) {
        setMlStatus({
          checking: false,
          ok: ml.ok,
          version: ml.model_version || (ml.ok ? 'xgb-v0.1' : null),
        });
        setBackendStatus({
          checking: false,
          ok: backend.ok,
        });
      }
    }

    probe();
    const interval = setInterval(probe, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { mlStatus, backendStatus };
}
