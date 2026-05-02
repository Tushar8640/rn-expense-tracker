# Agent Development Guide

This file is for future coding agents working on the Expense Tracker project.

## Operating Rules

- Read the relevant screen, storage service, type, and helper files before editing.
- Do not overwrite unrelated local changes. The worktree may be dirty.
- Keep edits scoped to the requested behavior.
- Prefer existing project patterns over new abstractions.
- Use TypeScript strictness as the baseline.
- Add or update documentation when behavior, setup, data shape, or build commands change.

## Project Map

- `app/_layout.tsx`: root providers, custom bottom tab bar, startup service calls.
- `app/index.tsx`: dashboard, reminders toggle, filter pills, budget warnings, recent transactions.
- `app/add.tsx`: create income/expense transactions.
- `app/edit.tsx`: update and delete transactions.
- `app/expenses.tsx`: transaction list and period filters.
- `app/reports.tsx`: monthly/yearly reports, charts, category breakdown, report sharing.
- `app/settings.tsx`: dark mode, budget limits, recurring transactions, backup/restore.
- `src/storage/expenseStorage.ts`: transaction and custom category persistence.
- `src/storage/budgetStorage.ts`: budget persistence.
- `src/storage/recurringService.ts`: recurring definitions and generated transactions.
- `src/storage/backupService.ts`: manual and automatic JSON backup/restore.
- `src/storage/notificationService.ts`: reminder permissions and scheduling.
- `src/context/ThemeContext.tsx`: light/dark color tokens and theme persistence.
- `src/utils/helpers.ts`: IDs, formatting, date filters, totals, grouping, report text.

## Architecture Notes

- This is an Expo Router app. Add new screens under `app/` and register tab visibility in `_layout.tsx` when needed.
- The app is local-first. Persistent app data currently lives in AsyncStorage and backup files.
- Startup side effects run in `_layout.tsx`: auto backup, recurring transaction processing, and notification initialization.
- Reports and dashboard calculations are derived from the full transaction list loaded from storage.
- Categories are string keys. Existing transactions can keep a deleted custom category key; `getCategoryInfo` safely falls back.

## Storage Guidelines

- Route all transaction changes through `expenseStorage.ts`.
- Route budget changes through `budgetStorage.ts`.
- Route recurring changes through `recurringService.ts`.
- If adding new persisted data, define a clear storage key and include it in backup expectations.
- If changing stored shapes, write migration-aware code that tolerates older records.
- Avoid throwing from storage reads during normal app usage; current services usually return safe defaults.

## UI Guidelines

- Use `useTheme()` colors in screens and shared components.
- Keep bottom navigation behavior consistent with `TAB_CONFIG`.
- Preserve mobile ergonomics: safe areas, scroll padding above tab bar, keyboard avoidance for forms.
- Keep validation messages direct and user-facing.
- Be careful with emoji-based UI. If adding an icon library later, migrate consistently instead of mixing styles heavily.

## Feature-Specific Cautions

- Backup import clears all existing AsyncStorage keys before restore.
- Automatic backups should not crash the app; preserve silent failure behavior for startup backup attempts.
- Recurring transaction generation should remain idempotent per calendar day and should not generate unbounded backlogs.
- Notification code uses lazy `require("expo-notifications")` to avoid crashes when unsupported. Preserve graceful fallback behavior.
- Budget alerts currently show at 70% or higher and use monthly/yearly expense totals excluding income.
- `formatCurrency` currently formats BDT-style output. Do not switch currencies without a product decision.

## Useful Commands

```bash
npm install
npm run start
npm run android
npm run ios
npm run web
```

There is no configured automated test command yet. If adding tests, add an npm script and document it in `README.md`.

## Manual Verification Checklist

- App launches without startup service errors.
- Add, edit, and delete transactions.
- Dashboard totals update after navigation focus.
- History filters match expected date ranges.
- Reports show correct income, spent, net, category breakdowns, and share text.
- Dark mode persists across app restart.
- Custom categories can be added, edited, selected, and deleted.
- Budget limits display in settings and dashboard warnings appear at expected thresholds.
- Recurring transactions generate once per due day and update `lastGeneratedDate`.
- Manual export/import backup works with the current data shape.

