import * as React from 'react';
import { OfflineQueueState, subscribe, getQueueState, processQueue } from '../services/offlineQueue';

export function useOfflineQueue(): [OfflineQueueState, () => Promise<void>] {
  const [state, setState] = React.useState<OfflineQueueState>(() => getQueueState());

  React.useEffect(() => {
    return subscribe(setState);
  }, []);

  const retry = React.useCallback(async () => {
    await processQueue();
  }, []);

  return [state, retry];
}
