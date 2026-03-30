import type { Street } from '../../engine/types';

export function streetLabel(s: Street): string {
  switch (s) {
    case 'preflop':
      return 'Preflop';
    case 'flop':
      return 'Flop';
    case 'turn':
      return 'Turn';
    case 'river':
      return 'River';
    default:
      return s;
  }
}
