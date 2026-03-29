import express from 'express';
import cors from 'cors';
import { generateScenario } from './scenarioGenerator';
import { adjudicate, checkUserAction } from '../src/engine/adjudication';
import type { ActionType, GameState, Position, Street } from '../src/engine/types';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const VALID_DIFFICULTIES = [1, 2, 3] as const;
const VALID_STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
const VALID_POSITIONS: Position[] = ['BTN', 'CO', 'HJ', 'MP', 'UTG', 'SB', 'BB'];
const VALID_ACTIONS: ActionType[] = ['fold', 'check', 'call', 'raise'];

// In-memory store for active scenarios — holds villain range between
// generate and adjudicate calls within a session
const activeScenarios = new Map<string, GameState>();

/**
 * POST /api/scenario/generate
 *
 * Generates a random game state for Decision Mode.
 * Body: { difficulty: 1|2|3, street?: string, position?: string }
 */
app.post('/api/scenario/generate', (req, res) => {
  try {
    const { difficulty, street, position } = req.body;

    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      res.status(400).json({
        error: 'difficulty is required and must be 1, 2, or 3',
      });
      return;
    }

    if (street && !VALID_STREETS.includes(street)) {
      res.status(400).json({
        error: `Invalid street. Must be one of: ${VALID_STREETS.join(', ')}`,
      });
      return;
    }

    if (position && !VALID_POSITIONS.includes(position)) {
      res.status(400).json({
        error: `Invalid position. Must be one of: ${VALID_POSITIONS.join(', ')}`,
      });
      return;
    }

    const scenario = generateScenario({
      difficulty: difficulty as 1 | 2 | 3,
      street,
      position,
    });

    const scenarioId = crypto.randomUUID();
    activeScenarios.set(scenarioId, scenario);

    // Auto-cleanup after 5 minutes
    setTimeout(() => activeScenarios.delete(scenarioId), 5 * 60 * 1000);

    // Strip villain range from client response
    const { villainRange, ...clientScenario } = scenario;
    void villainRange;

    res.json({ scenario: clientScenario, scenarioId });
  } catch (err) {
    console.error('Error generating scenario:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/scenario/adjudicate
 *
 * Takes a game state + user's action and returns correctness + EV breakdown.
 * Body: { scenarioId: string, userAction: string, userSizing?: number }
 *   OR: { gameState: GameState, userAction: string, userSizing?: number }
 */
app.post('/api/scenario/adjudicate', (req, res) => {
  try {
    const { scenarioId, gameState: rawGameState, userAction, userSizing } = req.body;

    if (!userAction || !VALID_ACTIONS.includes(userAction)) {
      res.status(400).json({
        error: `userAction is required and must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
      return;
    }

    let gameState: GameState;

    if (scenarioId && activeScenarios.has(scenarioId)) {
      gameState = activeScenarios.get(scenarioId)!;
    } else if (rawGameState) {
      gameState = rawGameState as GameState;
    } else {
      res.status(400).json({
        error: 'Either scenarioId or gameState is required',
      });
      return;
    }

    const result = adjudicate(gameState);
    const verdict = checkUserAction(
      userAction as ActionType,
      userSizing,
      result,
    );

    const potOddsRequired =
      gameState.callSize > 0
        ? gameState.callSize / (gameState.pot + gameState.callSize)
        : null;

    res.json({
      correct: verdict.correct,
      reason: verdict.reason,
      recommendedAction: result.recommendedAction,
      evByAction: result.evByAction,
      sizingRange: result.sizingRange,
      isMixed: result.isMixed,
      mixedFrequencies: result.mixedFrequencies,
      conceptTags: result.conceptTags,
      potOdds: potOddsRequired
        ? { required: potOddsRequired }
        : null,
    });
  } catch (err) {
    console.error('Error adjudicating:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`rivr server running on http://localhost:${PORT}`);
});

export default app;
