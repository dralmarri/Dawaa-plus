# Dawaa+ Project Instructions

## ⚠️ FIRST: ask which build the change is for
The project has two lines of development:

| Branch | Who it's for | Contains |
|---|---|---|
| `main` | **The store** (App Store / all users) | The public app only |
| `personal-healthkit` | **The owner's own iPhone only** | Everything in `main` + Apple Health import (BP, pulse, sugar). (The "النشاط والقلب" activity page was removed at the owner's request.) |

**Before starting ANY requested change to the app, ask the user (in Arabic) unless they already said:**

> هل هذا التحديث لك وحدك (نسختك الخاصة على هاتفك) أم للمتجر (لكل المستخدمين)؟

Then act accordingly:

- **For the store (`main`)**
  1. Work on `main`; build, commit, push `origin main`.
  2. Then bring it into the personal branch too: `git checkout personal-healthkit && git merge main`, resolve conflicts, build, push `origin personal-healthkit`, and return to `main`.
  3. Never add HealthKit to `main`: no `@capgo/capacitor-health`, no `App.entitlements`/`CODE_SIGN_ENTITLEMENTS`, no `NSHealth*` Info.plist keys, no `EcgPlugin`/`DawaaBridgeViewController`/`PedometerPlugin`, no `/activity` page. App Store review rejects binaries that link HealthKit without justification.
- **For the owner only (`personal-healthkit`)**
  1. Work on `personal-healthkit` only; build, commit, push `origin personal-healthkit`.
  2. **Never merge this branch into `main`.**

## Git — Standing Rules
- After **every code change**, run `npm run build` to verify no errors, then commit and push to the branch chosen above.
- Always pull before pushing: `git pull origin <branch> --no-rebase` if there are divergent branches.
- Commit messages should be concise and descriptive in English.

## Project
- Framework: Capacitor 8 + React 18 + TypeScript + Vite + Tailwind
- Backend: Supabase (PostgreSQL + Auth)
- iOS Bundle ID: `com.dawaaplus.app`

## After each change, tell the user to run (matching the branch)

**Store build (`main`):**
```bash
cd ~/Downloads/Dawaa-plus
git stash
git checkout main
git pull origin main
npm install
npm run build
npx cap sync ios
```
`npm install` matters here: it removes the HealthKit plugin left over from the personal branch, so it can't slip into a store upload.

**Personal build (`personal-healthkit`):**
```bash
cd ~/Downloads/Dawaa-plus
git stash
git checkout personal-healthkit
git pull origin personal-healthkit
npm install
npm run build
npx cap sync ios
```

Then in Xcode: ⇧⌘K (Clean) → ▶ (Run).
