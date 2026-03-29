import { create } from 'zustand';
import type { ActionType, Card, Position, Street } from '../engine/types';

const API_BASE = '';

export type GamePhase = 'idle' | 'loading' | 'playing' | 'feedback';

export interface ScenarioData {
  heroHand: [Card, Card];
  communityCards: Card[];
  pot: number;
  callSize: number;
  stackSize: number;
  position: Position;
  activePlayers: number;
  street: Street;
  actionHistory: string[];
  difficulty: number;
}

export interface AdjudicationData {
  correct: boolean;
  reason: string;
  recommendedAction: ActionType;
  evByAction: Record<ActionType, number>;
  sizingRange: { min: number; max: number };
  isMixed: boolean;
  mixedFrequencies?: { action: ActionType; frequency: number }[];
  conceptTags: string[];
  potOdds: { required: number } | null;
}

export interface SessionHand {
  scenario: ScenarioData;
  userAction: ActionType;
  userSizing?: number;
  result: AdjudicationData;
  timestamp: number;
}

interface GameStore {
  gamePhase: GamePhase;
  currentScenario: ScenarioData | null;
  scenarioId: string | null;
  userAction: ActionType | null;
  userSizing: number | undefined;
  adjudicationResult: AdjudicationData | null;
  sessionHistory: SessionHand[];
  difficulty: 1 | 2 | 3;
  error: string | null;

  setDifficulty: (d: 1 | 2 | 3) => void;
  loadScenario: () => Promise<void>;
  submitAction: (action: ActionType, sizing?: number) => Promise<void>;
  nextHand: () => Promise<void>;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gamePhase: 'idle',
  currentScenario: null,
  scenarioId: null,
  userAction: null,
  userSizing: undefined,
  adjudicationResult: null,
  sessionHistory: [],
  difficulty: 1,
  error: null,

  setDifficulty: (d) => set({ difficulty: d }),

  loadScenario: async () => {
    set({ gamePhase: 'loading', error: null });
    try {
      const { difficulty } = get();
      const res = await fetch(`${API_BASE}/api/scenario/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });
      if (!res.ok) throw new Error('Failed to generate scenario');
      const data = await res.json();
      set({
        gamePhase: 'playing',
        currentScenario: data.scenario,
        scenarioId: data.scenarioId,
        userAction: null,
        userSizing: undefined,
        adjudicationResult: null,
      });
    } catch (err) {
      set({
        gamePhase: 'idle',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  submitAction: async (action, sizing) => {
    const { scenarioId, currentScenario } = get();
    if (!scenarioId || !currentScenario) return;

    set({ userAction: action, userSizing: sizing, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/scenario/adjudicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, userAction: action, userSizing: sizing }),
      });
      if (!res.ok) throw new Error('Failed to adjudicate');
      const data: AdjudicationData = await res.json();
      set((state) => ({
        gamePhase: 'feedback',
        adjudicationResult: data,
        sessionHistory: [
          ...state.sessionHistory,
          {
            scenario: currentScenario,
            userAction: action,
            userSizing: sizing,
            result: data,
            timestamp: Date.now(),
          },
        ],
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  },

  nextHand: async () => {
    await get().loadScenario();
  },

  reset: () =>
    set({
      gamePhase: 'idle',
      currentScenario: null,
      scenarioId: null,
      userAction: null,
      userSizing: undefined,
      adjudicationResult: null,
      error: null,
    }),
}));
