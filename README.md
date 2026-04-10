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

---

## Deploy to GitHub Pages — Step by Step

### Step 1: Create a GitHub Repository

1. Go to [https://github.com/new](https://github.com/new)
2. Repository name: `pusoy-solver` (or any name you want)
3. Set to **Public** or **Private**
4. Click **Create repository**

### Step 2: Push Your Code

Open your terminal in the project folder and run:

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Pusoy Solver"

# Link to your GitHub repo (replace YOUR-USERNAME and YOUR-REPO)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# Push to main branch
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repo on GitHub: `https://github.com/YOUR-USERNAME/YOUR-REPO`
2. Click the **Settings** tab (gear icon at the top)
3. In the left sidebar, click **Pages**
4. Under **Build and deployment** → **Source**, select **GitHub Actions**
5. That's it — no other selection needed

### Step 4: Wait for Deployment

1. Click the **Actions** tab at the top of your repo
2. You'll see **Deploy to GitHub Pages** running
3. Wait for the green checkmark ✓ (takes ~1-2 minutes)
4. Click the deployment to see details

### Step 5: Access Your Live Site

Your app is now live at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

For example: `https://guillermo.github.io/pusoy-solver/`

### Step 6: Update After Changes

Every time you push to `main`, the site auto-deploys:

```bash
git add .
git commit -m "Your change description"
git push
```

Check the **Actions** tab to watch the deploy progress.

---

## Troubleshooting

### Page shows 404

- Make sure the **Source** is set to **GitHub Actions** in Settings → Pages
- Check the **Actions** tab for build errors
- Wait 1-2 minutes after the deploy finishes — propagation can take a moment

### Blank page / assets not loading

- Check the repo name matches the URL — the `BASE_URL` env var in the workflow handles this automatically
- If you renamed the repo, push a new commit to trigger a fresh deploy

### Build fails

Run `npm run build` locally to see the same errors the workflow will see:

```bash
npm install
npm run build
```
