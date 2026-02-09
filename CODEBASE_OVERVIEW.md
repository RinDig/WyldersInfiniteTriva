# Wylder's Infinite Trivia — Codebase Overview

## What This Is

An AI-powered trivia app for an 8-year-old named Wylder. She picks a topic and difficulty, the app calls Claude (Sonnet 4.5) to generate 35 fresh trivia questions on the fly, and she plays through them with scoring, streaks, confetti, and a results screen. Rate limited to 10 quiz generations per week.

## Architecture

Two independently deployed pieces:

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  GitHub Pages        │  POST   │  Cloudflare Worker   │  POST   │  Anthropic API  │
│  (React SPA)         │────────>│  (API Proxy)         │────────>│  Claude Sonnet  │
│                      │<────────│                      │<────────│  4.5            │
│  Static frontend     │  JSON   │  Holds API key       │  JSON   │                 │
│  No secrets here     │         │  Rate limits          │         │                 │
└─────────────────────┘         └──────────────────────┘         └─────────────────┘
```

The frontend NEVER touches the Anthropic API key. All requests go through the Cloudflare Worker which injects the key server-side.

## File Structure

```
├── index.html                  # Vite entry point (root, not in public/)
├── package.json                # React 18, canvas-confetti, Vite
├── vite.config.js              # Base path set to /wylders-trivia/ for GitHub Pages
│
├── src/
│   ├── main.jsx                # ReactDOM.createRoot, imports App and styles
│   ├── App.jsx                 # ALL app logic in one file (see breakdown below)
│   └── styles.css              # Global CSS, no CSS modules, uses CSS variables
│
├── worker/
│   ├── index.js                # Cloudflare Worker — receives POST with {prompt}, forwards to Anthropic
│   └── wrangler.toml           # Worker config, optional KV binding for server-side rate limiting
│
└── .github/workflows/
    └── deploy.yml              # GitHub Actions: npm ci → vite build → deploy to GitHub Pages
```

## src/App.jsx Breakdown

Everything is in one file. Here are the key parts:

### Config Constants
- `WORKER_URL`: Placeholder `'__WORKER_URL__'` — in practice the user sets this via the in-app settings modal (stored in localStorage as `trivia_worker_url`)
- `MAX_WEEKLY_GENS`: 10
- `QUESTIONS_PER_QUIZ`: 35
- `TOPICS`: Array of {id, icon, label} for the 7 topic categories
- `DIFFICULTIES`: easy, medium, hard, expert

### State Machine
The app uses a `screen` state with values: `home`, `loading`, `quiz`, `results`, `error`

### Key Functions
- `getWeekKey()` / `getGenCount()` / `incrementGenCount()`: localStorage-based weekly rate limiting using year+week as key
- `generateQuiz()`: Builds a detailed prompt, POSTs to the Cloudflare Worker, parses the JSON array response from Claude, sets questions state
- `handleAnswer()`: Tracks correctness, updates score/streak, fires confetti on correct
- `fireConfetti()` / `fireBigConfetti()`: canvas-confetti for single answers and end-of-quiz celebrations

### Components (all in App.jsx)
- `StarField`: Decorative animated star background (60 random dots with twinkle animation)
- `TopicPicker`: Grid of topic cards, highlights selected
- `QuestionView`: Renders a single question based on its `type` field. Handles multiple_choice, true_false, fill_in, and image types. Fill-in uses flexible matching (substring check both directions)
- `Results`: End-of-quiz score screen with stats and confetti
- Settings modal: Inline modal for entering the Cloudflare Worker URL

### Quiz Data Format
Claude is prompted to return a JSON array. Each question object:

```json
{
  "type": "multiple_choice" | "true_false" | "fill_in" | "image",
  "question": "string",
  "options": ["A", "B", "C", "D"],       // not present for fill_in
  "correct_index": 0,                      // not present for fill_in
  "answer": "short answer",               // only for fill_in
  "explanation": "fun educational fact",
  "image_query": "unsplash search term",  // null if no image
  "hint": "optional hint"                 // null if none
}
```

Images are loaded from `https://source.unsplash.com/800x400/?{image_query}` — no API key needed. The img tag has an onError handler that hides itself if the image fails.

## worker/index.js Breakdown

Minimal Cloudflare Worker:
- Handles CORS (preflight OPTIONS + response headers with `Access-Control-Allow-Origin: *`)
- Accepts POST with `{prompt: string}`
- Optional KV-based rate limiting (if `RATE_LIMIT` KV namespace is bound, tracks weekly count with 7-day TTL, server-side cap of 15)
- Forwards to `https://api.anthropic.com/v1/messages` with model `claude-sonnet-4-5-20250514`, max_tokens 8000
- Returns the raw Anthropic response JSON to the frontend

The API key is stored as a Wrangler secret (`env.ANTHROPIC_API_KEY`), never in code.

## Styling Notes

- Fonts: Fredoka (display/headings) + Quicksand (body) from Google Fonts
- Theme: Dark space/explorer aesthetic with gold (#f6c445) as primary accent
- All colors and radii use CSS custom properties
- Animations: CSS keyframes for fadeIn, fadeSlideUp, twinkle, shake, spin. No JS animation libraries
- Responsive: Single breakpoint at 480px, mobile-first
- No CSS framework, no Tailwind, just vanilla CSS

## Deployment

**Frontend**: Push to `main` branch → GitHub Actions runs `vite build` → deploys `dist/` to GitHub Pages at `https://rindig.github.io/WyldersInfiniteTriva/`

**Worker**: Deployed independently via `npx wrangler deploy` from the `worker/` directory. API key set via `npx wrangler secret put ANTHROPIC_API_KEY`.

## Things to Know If Modifying

- The vite.config.js `base` is set to `/wylders-trivia/`. If the repo name changes, update this to match
- The Unsplash source URL (`source.unsplash.com`) is a free redirect service, no auth needed, but it can be slow or occasionally return wrong images
- Fill-in answer matching is deliberately loose (substring both ways) since it's for a kid. Might want to tighten for older audiences
- The prompt engineering in `generateQuiz()` is the heart of quiz quality. Adjusting the system prompt there changes everything about what gets generated
- There's no persistent storage beyond localStorage. Quiz history isn't saved between sessions
- The Worker has CORS set to `*` which is fine for a single-user app but would need restricting for anything public
