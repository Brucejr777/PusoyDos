# Pusoy Strategy Solver

Chinese Poker (13-card) arrangement assistant with Monte Carlo simulation.

## Quick Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

## Deploy to GitHub Pages

1. Push to your repo's `main` or `master` branch
2. Go to **Settings → Pages → Build and deployment**
3. Set **Source** to `GitHub Actions`
4. The workflow deploys automatically on every push

### Manual trigger

Go to **Actions → Deploy to GitHub Pages → Run workflow**

### Access

Your app will be live at:
```
https://<your-username>.github.io/<your-repo>/
```

## How It Works

1. **Select 13 cards** from the bottom card grid
2. **Arrange them** into Front (3), Middle (5), Back (5) by clicking/dragging
3. **Get a suggestion** from the AI solver
4. **Run Monte Carlo** to see expected value against 3 random opponents

## Tech Stack

- Vite + React 18 + TypeScript
- Tailwind CSS
- Zustand (state management + undo/redo)
- @dnd-kit (drag-and-drop arrangement)
- Web Worker (solver runs off main thread)
