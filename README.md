# National Park Tracker

A React + Vite app for tracking trips to all 63 U.S. National Parks, with a calendar
spanning January 2017 – December 2040 and two progress trackers (as of today, and
as of any selected date).

## Local development

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Data storage

Trip data is saved in your browser's `localStorage`, under the key
`natparktracker.trips`. This means:

- Data persists across visits **on the same browser/device**.
- It does **not** sync across devices or browsers automatically.
- Clearing your browser's site data will erase your trips.

Use the **Export** button to download a JSON backup, and **Import** to restore it
(or move it to another browser/device).

## Deploying to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
builds and deploys automatically on every push to `main`.

One-time setup after pushing this repo to GitHub:

1. Go to your repo → **Settings → Pages**.
2. Under "Build and deployment", set **Source** to **GitHub Actions**.
3. Push to `main` (or re-run the workflow from the **Actions** tab).
4. Your site will be live at:
   `https://InspireFPU.github.io/NatParkTracker/`

### Pushing this project for the first time

```bash
cd NatParkTracker
git init
git add .
git commit -m "Initial commit: National Park Tracker"
git branch -M main
git remote add origin https://github.com/InspireFPU/NatParkTracker.git
git push -u origin main
```

### Manual deploy alternative (gh-pages branch)

If you'd rather not use Actions, you can deploy directly with the included
`gh-pages` package:

```bash
npm run deploy
```

This builds the app and pushes `dist/` to a `gh-pages` branch. If you use this
method, set Pages **Source** to "Deploy from a branch" → `gh-pages` → `/ (root)`
instead of GitHub Actions.

## Notes

- `vite.config.js` sets `base: "/NatParkTracker/"` to match GitHub Pages' project-site
  URL structure. If you rename the repo, update this to match.
- The park list (63 parks) reflects the National Park Service roster as of 2026.
