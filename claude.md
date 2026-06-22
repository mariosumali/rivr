# rivr — Project Context
See rivr_PRD.md for full spec.

Stack: Vite + React + TypeScript, Zustand, Framer Motion, Node/Express
Equity engine runs in a Web Worker — never on the main thread.
Correct-answer logic lives in the backend only.
CSS custom properties for all theming — no hardcoded colors in components.
```

---

## Phase 1 — Core Engine

This is your first prompt. The goal is a working equity engine and adjudication logic with no UI at all — just functions you can test.
```
Using rivr_PRD.md as the spec, build Phase 1: the core mathematical engine.

Do not build any UI. Build the following as pure TypeScript modules:

1. A Monte Carlo equity calculator that runs in a Web Worker.
   - Input: hero hand (2 cards), villain range (array of hand combos), 
     community cards (0–5 cards), iterations (default 10000)
   - Output: { heroEquity: number, villainEquity: number, ties: number }
   - Must be non-blocking — structured as a Web Worker from the start

2. A hand evaluator wrapper around pokersolver that evaluates 5–7 card hands 
   and returns a numeric strength score for comparison.

3. An adjudication module that takes a game state and returns the correct action.
   - Input: { heroHand, communityCards, pot, callSize, stackSize, 
     villainRange, position, activePlayers }
   - Output: { 
       recommendedAction: 'fold' | 'call' | 'raise',
       sizingRange: { min: number, max: number },
       evByAction: { fold: number, call: number, raise: number },
       isMixed: boolean,
       mixedFrequencies?: { action: string, frequency: number }[],
       conceptTags: string[]
     }
   - Mixed strategy threshold: ±0.5bb as defined in PRD Section 4.2

Write unit tests for all three modules. No UI, no Express server yet.
```

---

## Phase 2 — Backend API

Once the engine tests pass, wrap it in a thin Express layer.
```
Phase 1 engine is complete. Now build the Phase 2 backend.

Using rivr_PRD.md Section 4 and 7 as the spec, build a stateless 
Node/Express API with these endpoints:

POST /api/scenario/generate
  - Generates a random game state for Decision Mode
  - Accepts: { difficulty: 1 | 2 | 3, street?: string, position?: string }
  - Returns a full game state object (hero hand, community cards, 
    villain count, pot, stack depth, action history)
  - Difficulty logic per PRD Section 5.1 adaptive difficulty table

POST /api/scenario/adjudicate  
  - Takes a game state + user's chosen action + sizing
  - Returns the correct answer, EV breakdown, concept tags, 
    and whether the user was correct
  - Uses the adjudication module from Phase 1
  - Applies sizing tolerance per PRD Section 4.3

Keep it stateless — no database, no session. 
Add basic input validation and error handling.
```

---

## Phase 3 — UI Foundation

Don't start this until Phase 2 is working end-to-end.
```
Phases 1 and 2 are complete. Now build the Phase 3 UI foundation.

Using rivr_PRD.md Sections 6 and 7 as the spec:

1. Set up the Vite + React + TypeScript project with Zustand and Framer Motion.

2. Implement the CSS theming system first — before any components.
   - Four themes: dark (default), light, felt, neon
   - All colors as CSS custom properties on :root
   - Token names: --color-surface, --color-table, --color-bg, 
     --color-accent, --color-card-face, --color-text-primary
   - ThemeSwitcher component that writes to localStorage

3. Build the CardComponent with full 3D animation support.
   - CSS 3D transforms (rotateY, perspective, transform-style: preserve-3d)
   - Props: suit, rank, faceDown, animationState ('idle'|'dealing'|'flipping'|'folding')
   - Animation specs per PRD Section 6.2 exactly
   - Must look correct in all four themes

4. Build the PokerTable layout component.
   - Oval table, hero at bottom-center, opponents at arc positions
   - Responsive — works at 1024px+ viewport width
   - No game logic yet — accept positions and player data as props

Do not connect to the backend yet.
```

---

## Phase 4 — Decision Mode (wiring it together)
```
Phases 1–3 are complete. Wire them together into Decision Mode.

Using rivr_PRD.md Section 5.1 as the spec:

1. Build the Zustand game store.
   - State: gamePhase, currentScenario, userAction, adjudicationResult, 
     sessionHistory, difficulty
   - Actions: loadScenario, submitAction, nextHand, setDifficulty

2. Build the ActionPanel component.
   - Fold / Check / Call / Raise buttons
   - Raise sizing: quick-select buttons (½ pot, ¾ pot, pot, all-in) 
     plus a manual text input
   - Disabled states when action is not legal

3. Build the FeedbackPanel component.
   - Verdict (correct / incorrect) with color treatment
   - EV by action (numerical)
   - Pot odds: required equity vs. actual equity
   - Concept tag chips
   - Mixed strategy badge and frequency split if isMixed is true
   - Expandable detail section (collapsed by default)

4. Connect the full loop: fetch scenario from API → render table + cards 
   with deal animation → user selects action → POST to adjudicate → 
   render FeedbackPanel → 'Next Hand' advances to new scenario.