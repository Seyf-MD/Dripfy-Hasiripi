import * as React from 'react';

type NetworkStatus = {
  isOnline: boolean;
  effectiveType?: string | null;
};

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = React.useState<NetworkStatus>(() => ({
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    effectiveType: typeof navigator !== 'undefined' && 'connection' in navigator ? (navigator as any).connection?.effectiveType ?? null : null,
  }));

  React.useEffect(() => {
    function handleConnectionChange() {
      setStatus({
        isOnline: navigator.onLine,
        effectiveType: 'connection' in navigator ? (navigator as any).connection?.effectiveType ?? null : null,
      });
    }

    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    const connection = (navigator as any).connection;
    if (connection && typeof connection.addEventListener === 'function') {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
      if (connection && typeof connection.removeEventListener === 'function') {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return status;
}
