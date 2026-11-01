# Dawaa+ Project Instructions

## Branch: everything goes to the store (`main`)
- **All changes are for the store** (App Store / all users). Work on `main`; do not ask which build the change is for (the owner asked to stop asking, Nov 2026).
- The old `personal-healthkit` branch is retired: it was made identical to `main` when the owner removed all Apple Health features. Don't develop on it or merge into it.
- Never add HealthKit to `main`: no `@capgo/capacitor-health`, no `App.entitlements`/`CODE_SIGN_ENTITLEMENTS`, no `NSHealth*` Info.plist keys, no `EcgPlugin`/`PedometerPlugin`/`DawaaBridgeViewController`, no `/activity` page. App Store review rejects binaries that link HealthKit without justification.

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
git stash
git checkout main
git pull origin main
npm install
npm run build
npx cap sync ios
```
Then in Xcode: ⇧⌘K (Clean) → ▶ (Run).
