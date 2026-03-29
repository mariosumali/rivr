import type { Card, EquityResult, EquityWorkerRequest, EquityWorkerResponse } from './types';

/**
 * Client-side wrapper that spawns the equity Web Worker and returns a promise.
 * Ensures the main thread is never blocked by Monte Carlo simulation.
 */
export function calculateEquityAsync(
  heroHand: [Card, Card],
  villainRange: [Card, Card][],
  communityCards: Card[] = [],
  iterations: number = 10000,
): Promise<EquityResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./equityWorker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent<EquityWorkerResponse>) => {
      worker.terminate();
      if (e.data.type === 'result') {
        resolve(e.data.data);
      } else {
        reject(new Error(e.data.message));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    const request: EquityWorkerRequest = {
      heroHand,
      villainRange,
      communityCards,
      iterations,
    };
    worker.postMessage(request);
  });
}
