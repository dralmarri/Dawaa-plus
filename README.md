# Dawaa+ (دواء+)

A medication and health companion app: manage medications and dose reminders,
track blood pressure and blood sugar, record lab tests, and organize doctor
appointments.

## Tech stack

- Capacitor 8 (iOS & Android)
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn-ui
- Supabase (PostgreSQL + Auth)

- iOS bundle ID: `com.dawaaplus.app`

## Getting started

Requires Node.js & npm.

```sh
# Install dependencies
npm install

# Start the dev server (web preview)
npm run dev

# Production build
npm run build
```

## Native (Capacitor)

```sh
npm run build
npx cap sync ios      # or: npx cap sync android
npx cap open ios      # opens Xcode  (or: npx cap open android)
```

Then build/run from Xcode (iOS) or Android Studio.

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — type-check + production build
- `npm run lint` — run ESLint
- `npm run test` — run unit tests (Vitest)
