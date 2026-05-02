import AsyncStorage from "@react-native-async-storage/async-storage";
import { Expense, TransactionType } from "../types/expense";
import { saveExpense } from "./expenseStorage";
import { generateId } from "../utils/helpers";
import { format, addDays, addWeeks, addMonths, addYears, isBefore, startOfDay } from "date-fns";

const RECURRING_KEY = "recurring_transactions";
const LAST_RECURRING_CHECK_KEY = "last_recurring_check";

export type RecurrencePattern = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  pattern: RecurrencePattern;
  startDate: string; // ISO
  endDate?: string; // ISO, optional
  lastGeneratedDate?: string; // ISO, last date a transaction was auto-created
  isActive: boolean;
}

// --- CRUD ---

export const getRecurringTransactions = async (): Promise<RecurringTransaction[]> => {
  try {
    const data = await AsyncStorage.getItem(RECURRING_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveRecurringTransaction = async (rt: RecurringTransaction): Promise<void> => {
  const all = await getRecurringTransactions();
  all.push(rt);
  await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(all));
};

export const updateRecurringTransaction = async (updated: RecurringTransaction): Promise<void> => {
  const all = await getRecurringTransactions();
  const index = all.findIndex((r) => r.id === updated.id);
  if (index !== -1) {
    all[index] = updated;
    await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(all));
  }
};

export const deleteRecurringTransaction = async (id: string): Promise<void> => {
  const all = await getRecurringTransactions();
  const filtered = all.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(filtered));
};

export const toggleRecurringActive = async (id: string): Promise<void> => {
  const all = await getRecurringTransactions();
  const index = all.findIndex((r) => r.id === id);
  if (index !== -1) {
    all[index].isActive = !all[index].isActive;
    await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(all));
  }
};

// --- Auto-generate transactions ---

const getNextDate = (current: Date, pattern: RecurrencePattern): Date => {
  switch (pattern) {
    case "daily": return addDays(current, 1);
    case "weekly": return addWeeks(current, 1);
    case "monthly": return addMonths(current, 1);
    case "yearly": return addYears(current, 1);
  }
};

export const processRecurringTransactions = async (): Promise<number> => {
  const today = format(new Date(), "yyyy-MM-dd");
  const lastCheck = await AsyncStorage.getItem(LAST_RECURRING_CHECK_KEY);
  
  if (lastCheck === today) return 0; // Already processed today

  const all = await getRecurringTransactions();
  const todayStart = startOfDay(new Date());
  let generated = 0;

  for (const rt of all) {
    if (!rt.isActive) continue;

    // If there's an end date and it's passed, skip
    if (rt.endDate && isBefore(new Date(rt.endDate), todayStart)) continue;

    // Determine the next date to generate from
    let nextDate = rt.lastGeneratedDate
      ? getNextDate(new Date(rt.lastGeneratedDate), rt.pattern)
      : new Date(rt.startDate);

    // Generate all missed transactions up to today
    while (isBefore(startOfDay(nextDate), todayStart) || format(nextDate, "yyyy-MM-dd") === today) {
      // Don't generate future transactions
      if (isBefore(todayStart, startOfDay(nextDate)) && format(nextDate, "yyyy-MM-dd") !== today) break;

      const expense: Expense = {
        id: generateId(),
        type: rt.type,
        amount: rt.amount,
        category: rt.category,
        date: nextDate.toISOString(),
        note: rt.note ? `${rt.note} (recurring)` : "(recurring)",
        createdAt: new Date().toISOString(),
      };

      await saveExpense(expense);
      rt.lastGeneratedDate = nextDate.toISOString();
      generated++;

      nextDate = getNextDate(nextDate, rt.pattern);

      // Safety: max 30 transactions per recurring item per check
      if (generated > 30) break;
    }
  }

  // Save updated lastGeneratedDate values
  await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(all));
  await AsyncStorage.setItem(LAST_RECURRING_CHECK_KEY, today);

  return generated;
};
