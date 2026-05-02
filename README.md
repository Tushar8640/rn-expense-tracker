# Expense Tracker

A local-first Expo React Native app for tracking income, expenses, budgets, recurring transactions, reminders, reports, and backups. The app is built with Expo Router, TypeScript, React Native, AsyncStorage, NativeWind/Tailwind configuration, date-fns, SVG charts, Expo Notifications, and Expo File System services.

## Project Status

- App version: `1.1.0` in `app.json`
- Package version: `1.0.0` in `package.json`
- Runtime: Expo SDK `~54.0.33`, React Native `0.81.5`, React `19.1.0`
- Navigation: file-based routes through `expo-router`
- Storage: local device storage through `@react-native-async-storage/async-storage`
- Currency formatting: Bangladeshi Taka display via `formatCurrency`

## Features

- Dashboard with income, spending, net balance, recent transactions, period filters, and budget alerts.
- Add and edit income or expense transactions with amount, category, date, and note.
- Transaction history with all, today, month, and year filters.
- Monthly and yearly reports with summary cards, bar charts, category breakdowns, daily average, and shareable text reports.
- Default and custom categories, including custom emoji and color selection.
- Budget limits by category with monthly or yearly periods and warning states when usage reaches 70% or more.
- Recurring transactions for daily, weekly, monthly, or yearly income and expenses.
- Daily reminders at 8:00 AM and 9:00 PM when notifications are enabled.
- Dark mode preference persisted locally.
- Manual JSON export/import backup.
- Automatic daily local backups, keeping the latest 7 backup files.

## App Structure

```text
app/
  _layout.tsx       Root layout, tab navigation, startup services
  index.tsx         Dashboard
  add.tsx           Add transaction
  edit.tsx          Edit/delete transaction
  expenses.tsx      Transaction history
  reports.tsx       Reports and sharing
  settings.tsx      Theme, budgets, recurring, backup/restore

src/
  components/       Reusable UI and chart components
  context/          Theme context and color tokens
  storage/          AsyncStorage, backup, recurring, notification services
  types/            Transaction and category types
  utils/            Formatting, filtering, grouping, report helpers

assets/             App icons and splash assets
scripts/            Utility scripts, including icon generation
```

## Data Model

Transactions use the `Expense` interface in `src/types/expense.ts`:

```ts
type TransactionType = "expense" | "income";

interface Expense {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note: string;
  createdAt: string;
}
```

Important local storage keys:

- `expenses`: transaction list
- `custom_categories`: user-created categories
- `category_budgets`: budget limits
- `recurring_transactions`: recurring transaction definitions
- `last_recurring_check`: daily recurring processing guard
- `theme_preference`: light/dark theme setting
- `notifications_enabled`: reminder toggle state
- `last_auto_backup_date`: automatic backup guard

## Getting Started

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm run start
```

Run on a target platform:

```bash
npm run android
npm run ios
npm run web
```

## Build

The project includes EAS build profiles in `eas.json`:

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
```

- `preview` builds an Android APK.
- `production` builds an Android App Bundle.

## Development Guidelines

- Keep routes in `app/` and shared code in `src/`.
- Use existing storage services instead of reading/writing AsyncStorage directly from screens.
- Use `useTheme()` colors for screen styling so light and dark mode stay consistent.
- Use helpers in `src/utils/helpers.ts` for date filtering, grouping, currency formatting, and report generation.
- Preserve the local-first behavior. Any future cloud sync should be additive and migration-aware.
- Treat backup import as destructive because it replaces existing AsyncStorage data.
- Validate amounts before saving; valid transaction and budget amounts must be greater than 0.
- Keep recurring transaction processing idempotent per day through `last_recurring_check`.

## Testing Notes

There is no test script configured yet. For manual verification after changes:

- Start the app with `npm run start`.
- Add income and expense transactions.
- Verify dashboard totals, history filters, and report totals.
- Test custom category add/edit/delete behavior.
- Toggle dark mode and restart the app.
- Add a budget and confirm dashboard alerts at 70% usage or higher.
- Add a recurring transaction and verify startup processing behavior.
- Export a backup and import it into a clean app state before relying on backup changes.

