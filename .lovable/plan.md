## Goal
Convert the Settings page into a "list of rows" pattern where each setting group opens in a dedicated modal dialog (bottom-sheet style). This matches the request to make "كل مربع" a dropdown/naفذة window.

## Plan

### 1. Replace the long inline cards with compact summary rows
Each current settings card will become a single clickable row that displays the setting title and current value (or status). The row will be inside the same card-style container, but now the user must tap it to edit.

Rows to create:
- Language: shows "العربية / English" and opens a language dialog
- Theme: shows "Dark / Light" and opens a theme dialog
- Account info: shows the signed-in email or guest mode
- User Profile: shows a summary of filled fields (name, DOB, blood type, allergies, conditions, emergency contact) and opens a comprehensive profile dialog
- Blood Sugar Tracking: shows enabled/disabled status and opens a dialog with the toggle
- Medication Notifications: shows enabled/disabled and reminder timing; opens a dialog with the toggle and reminder options
- Blood Pressure Reminders: shows enabled/disabled and times; opens a dialog with the toggle and time list
- About links, share, sign in/out, delete account remain as-is (they already navigate or open dialogs)

### 2. Create modal dialogs (bottom sheet style)
Use the existing `Dialog` component from `@/components/ui/dialog` and wrap each dialog's content to look like a bottom sheet on mobile and a centered modal on desktop. Each dialog will contain the existing form controls and selection chips, so no logic is lost.

Dialogs to implement:
- LanguageDialog: two language buttons (Arabic / English)
- ThemeDialog: dark/light selection
- ProfileDialog: all user profile fields in one scrollable dialog (name, DOB, allergies, chronic diseases chips, blood type chips, custom diseases, emergency contact fields)
- BloodSugarDialog: toggle for tracking
- NotificationsDialog: toggle for medication reminders + reminder time chip selector
- BloodPressureDialog: toggle for BP reminders + custom times list with add/remove

### 3. Preserve data flow
The existing `update(partial)` helper will continue to save changes immediately to the store. The `useState` for `settings` and the `update` function remain unchanged. Each dialog will receive `settings` and `update` as props and use them the same way the inline forms currently do.

### 4. Reuse existing components
Keep using `ChipSelector` for reminder-before, and use the same chip/button styles for chronic diseases and blood type. Keep all labels and icons.

### 5. Verify
- TypeScript compilation (`bun tsc --noEmit`)
- Manual preview check that each row opens its dialog and saves changes
- Ensure RTL layout and Arabic/English labels remain correct

## Technical Details
- File: `src/pages/SettingsPage.tsx`
- Add a few new `useState` booleans to track dialog visibility (`languageOpen`, `themeOpen`, `profileOpen`, `bloodSugarOpen`, `notificationsOpen`, `bpOpen`).
- Import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog` (already used elsewhere).
- Use `Chevron` icon for row affordance, already defined in the file.
- Keep the existing Share modal and delete-account confirmation dialogs unchanged.