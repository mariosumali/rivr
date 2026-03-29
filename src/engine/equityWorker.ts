import { calculateEquity } from './equity';
import type { EquityWorkerRequest, EquityWorkerResponse } from './types';

self.onmessage = (e: MessageEvent<EquityWorkerRequest>) => {
  try {
    const { heroHand, villainRange, communityCards, iterations } = e.data;
    const result = calculateEquity(heroHand, villainRange, communityCards, iterations);
    const response: EquityWorkerResponse = { type: 'result', data: result };
    self.postMessage(response);
  } catch (err) {
    const response: EquityWorkerResponse = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};
