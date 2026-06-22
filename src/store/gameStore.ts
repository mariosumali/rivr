import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActionType, AdjudicationResult, Card, Position, Street, VillainAction } from '../engine/types';
import { checkUserAction } from '../engine/adjudication';

const API_BASE = '';
const MAX_HISTORY = 250;

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
  villainPosition?: Position;
  villainAction?: VillainAction;
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
  heroEquity?: number;
  potOdds: { required: number } | null;
}

export interface SessionHand {
  scenario: ScenarioData;
  userAction: ActionType;
  userSizing?: number;
  result: AdjudicationData;
  timestamp: number;
}

export interface Settings {
  /** Decision timer in seconds; 0 = off. */
  timerSeconds: number;
  /** Auto-advance to the next hand after a correct answer. */
  autoAdvance: boolean;
  /** Expand the full analysis detail by default in feedback. */
  expandDetail: boolean;
}

export interface RangeStat {
  total: number;
  correct: number;
}

const DEFAULT_SETTINGS: Settings = {
  timerSeconds: 0,
  autoAdvance: false,
  expandDetail: false,
};

interface GameStore {
  gamePhase: GamePhase;
  currentScenario: ScenarioData | null;
  scenarioId: string | null;
  userAction: ActionType | null;
  userSizing: number | undefined;
  adjudicationResult: AdjudicationData | null;
  sessionHistory: SessionHand[];
  difficulty: 1 | 2 | 3;
  settings: Settings;
  rangeStats: Record<string, RangeStat>;
  isReplay: boolean;
  replayResult: AdjudicationData | null;
  error: string | null;

  setDifficulty: (d: 1 | 2 | 3) => void;
  setSettings: (patch: Partial<Settings>) => void;
  loadScenario: () => Promise<void>;
  submitAction: (action: ActionType, sizing?: number) => Promise<void>;
  nextHand: () => Promise<void>;
  skipHand: () => Promise<void>;
  replayHand: (hand: SessionHand) => void;
  recordRangeAnswer: (position: Position, correct: boolean) => void;
  clearHistory: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gamePhase: 'idle',
      currentScenario: null,
      scenarioId: null,
      userAction: null,
      userSizing: undefined,
      adjudicationResult: null,
      sessionHistory: [],
      difficulty: 1,
      settings: DEFAULT_SETTINGS,
      rangeStats: {},
      isReplay: false,
      replayResult: null,
      error: null,

      setDifficulty: (d) => set({ difficulty: d }),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      loadScenario: async () => {
        set({ gamePhase: 'loading', error: null, isReplay: false, replayResult: null });
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
            error:
              err instanceof Error
                ? `${err.message}. Is the rivr server running? (npm run server)`
                : 'Unknown error',
          });
        }
      },

      submitAction: async (action, sizing) => {
        const { scenarioId, currentScenario, difficulty, isReplay, replayResult } = get();
        if (!currentScenario) return;

        set({ userAction: action, userSizing: sizing, error: null });

        // Replay: grade locally against the stored adjudication — no server call,
        // no new history entry.
        if (isReplay && replayResult) {
          const verdict = checkUserAction(action, sizing, replayResult as unknown as AdjudicationResult);
          set({
            gamePhase: 'feedback',
            adjudicationResult: { ...replayResult, correct: verdict.correct, reason: verdict.reason },
          });
          return;
        }

        if (!scenarioId) return;
        try {
          const res = await fetch(`${API_BASE}/api/scenario/adjudicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarioId, userAction: action, userSizing: sizing, difficulty }),
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
            ].slice(-MAX_HISTORY),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Unknown error' });
        }
      },

      nextHand: async () => {
        await get().loadScenario();
      },

      skipHand: async () => {
        await get().loadScenario();
      },

      replayHand: (hand) => {
        set({
          gamePhase: 'playing',
          currentScenario: hand.scenario,
          scenarioId: null,
          userAction: null,
          userSizing: undefined,
          adjudicationResult: null,
          isReplay: true,
          replayResult: hand.result,
          error: null,
        });
      },

      recordRangeAnswer: (position, correct) =>
        set((s) => {
          const prev = s.rangeStats[position] ?? { total: 0, correct: 0 };
          return {
            rangeStats: {
              ...s.rangeStats,
              [position]: {
                total: prev.total + 1,
                correct: prev.correct + (correct ? 1 : 0),
              },
            },
          };
        }),

      clearHistory: () =>
        set({ sessionHistory: [], rangeStats: {}, gamePhase: 'idle', currentScenario: null }),

      reset: () =>
        set({
          gamePhase: 'idle',
          currentScenario: null,
          scenarioId: null,
          userAction: null,
          userSizing: undefined,
          adjudicationResult: null,
          isReplay: false,
          replayResult: null,
          error: null,
        }),
    }),
    {
      name: 'rivr-session',
      partialize: (s) => ({
        sessionHistory: s.sessionHistory,
        difficulty: s.difficulty,
        settings: s.settings,
        rangeStats: s.rangeStats,
      }),
    },
  ),
);
