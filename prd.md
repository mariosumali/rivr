# rivr — Product Requirements Document
**Version:** 2.0 — Math-First + UI Revision
**Scope:** Texas Hold'Em — 6-max & 9-max cash game formats
**Stack:** Vite + React + Zustand · CSS 3D + Framer Motion · Monte Carlo Web Worker
**Status:** Draft — pre-development

---

## Table of Contents
1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Mathematical Framework](#4-mathematical-framework)
5. [Core Modes](#5-core-modes)
6. [UI, Animation & Theming](#6-ui-animation--theming)
7. [Technical Architecture](#7-technical-architecture)
8. [Scope & Phasing](#8-scope--phasing)
9. [Open Questions](#9-open-questions)

---

## 1. Overview

PokerIQ is a web-based poker training application that teaches mathematically correct decision-making in Texas Hold'Em. Players are placed into realistic game states and must make the optimal action — fold, call, or raise to the correct size — grounded entirely in expected value, equity, and pot odds.

The teaching philosophy is **math-first**: correctness is defined by EV calculation, not opinion or heuristic. Explanations exist to help users understand the math — not to replace it. PokerIQ is not a casual poker game. It is a deliberate practice environment built for players who want to improve.

> **Core Principle:** Every correct answer in PokerIQ has a mathematical justification. The feedback layer exists to teach users how to arrive at that answer themselves — through pot odds, equity estimation, and EV reasoning — not to provide a shortcut around it.

---

## 2. Problem Statement

Learning optimal poker strategy is hard for a specific structural reason: **the feedback loop is broken.**

- **Static tools** (charts, solvers, books) teach you what is correct but give you no practice applying it under game conditions.
- **Actual play** gives you practice but almost no reliable feedback — outcomes are noisy, spots are unrepeatable, and bad decisions can still win.

No mainstream tool lets players practice decision-making in procedurally generated, mathematically grounded game states with immediate, explanation-driven feedback on every hand. PokerIQ closes this gap.

---

## 3. Goals & Non-Goals

### 3.1 Goals
- Teach mathematically correct Texas Hold'Em decisions through active, repetitive practice
- Ground every correct answer in EV, equity, and pot odds — not heuristics alone
- Handle mixed-strategy GTO spots transparently: show frequency split and accept either action
- Support all skill levels via adaptive difficulty progression
- Deliver a polished, minimal UI with fluid 3D card animations and multiple visual themes
- Ship a focused v1: Decision Mode, Range Trainer, Free Play, Post-Session Review

### 3.2 Non-Goals (v1)
- Real-money or chip-wagering features
- Multiplayer or real-time networked play
- Full GTO solver API integration (GTO Wizard, PioSOLVER) — planned v2
- Mobile native app (responsive web only)
- Variants beyond Texas Hold'Em

---

## 4. Mathematical Framework

This section defines how PokerIQ determines the "correct" action for any game state. All correctness logic runs on the backend; the frontend is purely display.

### 4.1 Correct Action Pipeline

1. Deal hero hand and community cards; assign villain range estimates by archetype and position.
2. Run Monte Carlo equity simulation (~10,000 iterations) in a Web Worker to calculate hero equity vs. villain range.
3. Calculate pot odds: `required equity to call = call_size / (pot + call_size)`
4. Calculate effective stack-to-pot ratio (SPR) to determine commitment thresholds.
5. Apply fold equity modifier for raise decisions: `estimated fold% × (pot won) + (1 − fold%) × equity-adjusted EV`
6. Produce a primary recommended action, acceptable sizing range, and EV differential between actions.
7. Tag the decision with concept labels (Pot Odds, Equity, SPR, Fold Equity, 3-Bet, C-Bet, etc.) for analytics.

### 4.2 Mixed Strategy Handling

GTO frequently prescribes mixed strategies — spots where two actions (e.g. raise and call) are near-indifferent in EV. PokerIQ handles these as follows:

> **Mixed Strategy Policy:** When two actions have EV within a defined threshold (default: ±0.5bb), PokerIQ treats both as correct. The feedback panel displays the GTO frequency split (e.g. *Raise 55% / Call 45%*), marks the user's answer as correct, and explains why the spot is near-indifferent. This is shown as a teaching moment — not a gotcha.

- Mixed spots are tagged with a **Mixed Strategy** badge in the feedback panel
- EV differential between actions is always shown numerically (e.g. *Raise EV: +1.8bb  |  Call EV: +1.6bb*)
- Adaptive difficulty reduces the frequency of mixed spots at beginner levels to avoid confusion

### 4.3 Raise Sizing Tolerance

| Scenario | Tolerance Window | Behavior if Outside |
|---|---|---|
| Standard raise | ±15% of GTO-optimal size | Marked incorrect; correct size shown |
| All-in or pot-sized bet | Exact | Exact sizing required |
| Mixed spot with sizing component | ±20% of optimal | Looser window; EV impact shown |

---

## 5. Core Modes

### 5.1 Decision Mode *(Primary)*

The core training loop. Users are placed into a fully specified game state and must select the mathematically correct action. Designed to feel like flashcards — fast, frictionless, repetitive.

#### Game State Parameters

| Parameter | Details |
|---|---|
| Table format | 6-max or 9-max, configurable per session |
| Street | Preflop, Flop, Turn, River |
| Position | BTN, CO, HJ, MP, UTG, SB, BB |
| Stack depth | 20bb–200bb, randomized within difficulty bracket |
| Active players | 1–8, configurable |
| Action history | Prior street actions displayed (fold / call / raise / check / bet) |
| Board texture | Randomized; complex textures increase with difficulty level |

#### User Actions
- Fold / Check / Call / Raise (with sizing input — slider or text field)
- Raise sizing evaluated against tolerance window defined in Section 4.3
- Time pressure is optional — configurable decision timer for advanced users

#### Feedback Panel *(post-decision)*
- **Verdict:** Correct / Incorrect with clear color treatment
- **EV breakdown:** numerical EV shown for each possible action
- **Pot odds display:** required equity vs. actual equity
- **Concept tags:** labeled chips for concepts exercised (e.g. "Pot Odds", "SPR", "Fold Equity")
- **Mixed strategy disclosure:** if applicable, GTO frequency split and indifference explanation
- **Expandable detail:** beginners see a summary; advanced users can expand to full equity breakdown and range visualization

#### Adaptive Difficulty

| Level | Label | Characteristics |
|---|---|---|
| 1 | Beginner | Preflop only, deep stacks (100bb+), heads-up, clear-cut EV decisions, no mixed spots |
| 2 | Intermediate | Post-flop introduced, 3–4 players, moderate SPR, standard boards, rare mixed spots |
| 3 | Advanced | Full streets, multi-way pots, complex textures, mixed strategy spots included |
| Auto | Adaptive | Tracks accuracy per concept tag and adjusts difficulty per-concept independently |

---

### 5.2 Range Trainer

A focused drill mode for preflop hand selection. Users see their position, stack depth, and hole cards, and must classify the correct action.

- **Drill types:** Opening range, 3-bet range, calling range vs. open, 4-bet range
- Correct ranges sourced from GTO-derived preflop charts per position and stack depth
- Session progress tracked per position; weak positions surfaced in post-session review
- **Visual range grid:** after answering, display the full 13×13 range matrix with the hero hand highlighted

---

### 5.3 Free Play Mode

A full simulated hand from preflop to showdown. Opponent archetypes produce realistic game states for the user to navigate without training guardrails.

#### Opponent Archetypes

| Archetype | Tag | Behavior |
|---|---|---|
| Tight-Aggressive | TAG | Opens ~15% of hands, value-bets strong, folds to 3-bets without premiums |
| Loose-Aggressive | LAG | Wide opens, frequent c-bets and bluffs, pressure on all streets |
| Loose-Passive | LP | Calling station; wide range, rarely raises, chases draws |
| Tight-Passive | Nit | Plays premiums only, almost never bluffs, easy to range |

- Table composition fully configurable per session
- Opponent actions are range-driven with archetype-specific frequency randomization
- Showdown: reveal all hands, display equity at every decision point retrospectively
- All hands auto-saved to session history

---

### 5.4 Post-Session Review

- Session timeline: hands played with street-by-street action log
- Decision accuracy broken down by: Street, Position, Concept tag, Difficulty
- **Replay hand:** re-enter any saved hand in Decision Mode to re-examine a specific spot
- **Weak spot surface:** concept tags below accuracy threshold flagged with drill suggestions
- Session stats: accuracy rate, correct streak, hands played, estimated EV lost to mistakes

---

## 6. UI, Animation & Theming

PokerIQ's visual identity is deliberately non-casino. The default aesthetic is inspired by minimalist, matte playing card design — dark surfaces, geometric suit symbols, tight typography, and purposeful negative space. Animations are not decorative. They carry meaning: a card flip communicates a reveal; a deal sequence communicates turn order.

### 6.1 Card Design System

- **Default card:** dark matte background (`#1A1A1A`), geometric suit icons (circle, square, triangle, minimal club), minimal rank typography
- Cards are React components backed by CSS 3D transform perspective planes
- **Suit colors:** spades/clubs use off-white (`#E8E8E8`); hearts use muted red (`#C0392B`); diamonds use muted blue (`#2E86C1`)
- **Corner radius:** 8px · **Proportions:** standard 2.5:3.5 ratio · **Drop shadow:** soft, 8px blur
- **Face-down state:** textured dark reverse with a subtle geometric pattern

### 6.2 Animation Spec

> **Philosophy:** All card animations use CSS 3D transforms (`rotateY`, `perspective`, `transform-style: preserve-3d`) for hardware-accelerated performance. GSAP or Framer Motion handles sequencing. Target 60fps at all times. Interactive feedback animations ≤ 400ms. Deal sequences may run up to 800ms total.

| Animation | Trigger | Spec |
|---|---|---|
| Card deal | New hand begins | Cards slide from deck center position, 80ms stagger per card, slight arc trajectory, ease-out cubic |
| Card flip (reveal) | Community card / showdown | `rotateY` 0→180° in 320ms, back-face hidden, ease-in-out, face appears at 90° midpoint |
| Card hover | Mouse enter on hole card | Scale 1.04, `translateY -4px`, shadow deepens, 120ms ease-out |
| Fold | Hero or opponent folds | Card slides and fades to discard pile, 240ms ease-in |
| Chip bet | Any bet / raise action | Chip stack arcs from player position to pot center, 280ms |
| Feedback reveal | User submits action | Panel slides up from bottom (mobile) / in from right (desktop), 200ms ease-out. Correct: green pulse. Incorrect: subtle red desaturation. |
| Theme switch | User changes theme | CSS variable transition, 300ms cross-fade |

### 6.3 Visual Themes

All themes share identical layout and component structure. Theming is implemented via CSS custom properties — switching themes does not reload the app.

| Theme | ID | Card Surface | Table Surface | Background | Accent |
|---|---|---|---|---|---|
| Dark Minimal *(default)* | `dark` | `#1A1A1A` matte | `#141414` | `#0D0D0D` | Red `#C0392B` |
| Paper White | `light` | `#F5F0E8` linen | `#E8E0D0` | `#FAF7F2` | Navy `#1A2E44` |
| Felt Green | `felt` | `#1A1A1A` matte | `#1B4D2E` felt | `#0F2D1A` | Gold `#D4AF37` |
| Neon / Cyberpunk | `neon` | `#0D0D0D` matte | `#080810` | `#050508` | Neon green `#00FF88` |

- Theme selection persisted to `localStorage`
- Each theme ships with a matching card back texture and table surface (SVG or CSS-generated)
- Neon theme: hearts → hot pink `#FF2D78`, diamonds → cyan `#00D4FF`
- Users can override the accent color within any theme (hex input)

### 6.4 Layout Principles

- Oval table centered in viewport; player positions arranged at fixed arc positions
- Hero always at bottom-center; opponents arranged clockwise from BTN
- Community cards displayed in a horizontal row at table center with staged deal animation
- Pot displayed above community cards; bet amounts float near each player position
- Feedback panel overlays bottom third on mobile; slides in from right on desktop
- **No modals.** All feedback is inline or panel-based to preserve game state visibility

---

## 7. Technical Architecture

### 7.1 Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Vite + React + TypeScript | Fast HMR, component model ideal for card/player state |
| State | Zustand | Minimal boilerplate; game state is a single flat store |
| Animation | Framer Motion + CSS 3D transforms | Framer handles sequencing; CSS transforms for GPU-accelerated card physics |
| Equity engine | Monte Carlo in Web Worker (TypeScript) | Non-blocking; ~10k iterations ≈ 8–12ms |
| Hand evaluator | `pokersolver` or `Hand-Evaluator.js` | Battle-tested JS 5/7-card evaluation |
| Backend | Node.js + Express, stateless | Scenario generation, correct-answer adjudication |
| Persistence (v1) | `localStorage` for session history | No auth required for v1 |
| Theming | CSS custom properties (design tokens) | Zero-cost theme switching, no re-render |

### 7.2 Component Architecture

```
PokerTable               — root layout, positions, perspective container
├── CardComponent        — CSS 3D card with face/back states, deal/flip/fold animation props
├── PlayerSeat           — avatar, stack size, bet amount, active indicator
├── CommunityCards       — board row with staged deal animation
├── ActionPanel          — fold/check/call/raise controls with sizing input
├── FeedbackPanel        — verdict, EV breakdown, concept tags, expandable detail
├── ThemeSwitcher        — persists to localStorage, triggers CSS variable swap
└── SessionHistory       — hand log, accuracy charts, replay entry points
```

### 7.3 Correct Answer Flow

```
Game state generated
        ↓
Web Worker: Monte Carlo equity simulation (~10k iterations)
        ↓
Backend: pot odds + SPR + fold equity calculation
        ↓
Produce: { recommendedAction, sizingRange, evByAction, conceptTags, isMixed }
        ↓
UI: user selects action → adjudicate → FeedbackPanel render
```

> **Performance constraint:** The equity engine must never block the main thread. All Monte Carlo simulation runs in a dedicated Web Worker. The UI shows a brief "Calculating…" state (max 200ms) before displaying the feedback panel. On low-end devices, iteration count can drop to 5,000 with negligible accuracy loss (~1–2%).

---

## 8. Scope & Phasing

| Feature | v1 | v2 / Future |
|---|---|---|
| Decision Mode | Full implementation | — |
| Range Trainer | Preflop only | Post-flop ranges |
| Free Play Mode | Archetype bots | GTO-calibrated opponents |
| Post-Session Review | Session history + accuracy | Cross-session trends, EV tracking |
| Mixed strategy handling | Both actions accepted, EV shown | — |
| Equity engine | Monte Carlo (Web Worker) | GTO solver lookup tables |
| Card animations | Full 3D deal / flip / fold spec | — |
| Themes | Dark, Light, Felt, Neon + custom accent | User-uploaded custom themes |
| Persistence | `localStorage` | User accounts + cloud sync |
| Variants | Texas Hold'Em only | Omaha, Short Deck |
| Multiplayer | Not in scope | Potential v3 |

---

## 9. Open Questions

- **EV indifference threshold:** The default mixed-strategy window is ±0.5bb. Should this scale with stack depth (e.g. ±0.5% of stack) or remain absolute?
- **Villain range estimation:** In Decision Mode with no assigned archetype, how do we model villain ranges? Default to population-average opening ranges per position?
- **Session persistence boundary:** Does `localStorage` history persist across browser sessions, or reset per tab? *(Recommendation: persist by default with a 'clear history' option.)*
- **Scenario novelty guarantee:** Should the generator guarantee no repeated scenario within a session, or is statistical unlikeliness sufficient?
- **Opponent modeling variance:** How much should archetype bots deviate from base frequencies? Too predictable undermines realism; too random undermines learnability.
- **Sizing input UX:** Slider vs. text field vs. quick-select buttons (e.g. "½ pot", "¾ pot", "pot") — which feels fastest in the Decision Mode flashcard context?

---

*PokerIQ — PRD v2.0 · Texas Hold'Em Decision Trainer · Draft*
