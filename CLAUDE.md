# Dawaa+ Project Instructions

## Git — Standing Rules
- After **every code change**, run `npm run build` to verify no errors, then commit and push to `origin main`.
- Always pull before pushing: `git pull origin main --no-rebase` if there are divergent branches.
- Commit messages should be concise and descriptive in English.

## Project
- Framework: Capacitor 8 + React 18 + TypeScript + Vite + Tailwind
- Backend: Supabase (PostgreSQL + Auth)
- iOS Bundle ID: `com.dawaaplus.app`

## After each change, tell the user to run
```bash
cd ~/Downloads/Dawaa-plus
git pull origin main
npm run build
npx cap sync ios
```
Then in Xcode: ⇧⌘K (Clean) → ▶ (Run).
