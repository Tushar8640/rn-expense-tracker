import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  eachMonthOfInterval,
} from "date-fns";
import { Expense, DEFAULT_CATEGORIES, getCategoryInfo, CategoryInfo } from "../types/expense";

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const formatCurrency = (amount: number): string => {
  return "৳" + amount.toLocaleString("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const formatCompactCurrency = (amount: number): string => {
  const absAmount = Math.abs(amount);

  if (absAmount <= 1000) {
    return formatCurrency(amount);
  }

  const units = [
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "K" },
  ];
  const unit = units.find((item) => absAmount >= item.value)!;
  const compactValue = absAmount / unit.value;
  const formatted =
    compactValue >= 10
      ? Math.round(compactValue).toString()
      : Number(compactValue.toFixed(1)).toString();

  return `৳${amount < 0 ? "-" : ""}${formatted}${unit.suffix}`;
};

export const formatDate = (dateStr: string): string => {
  return format(parseISO(dateStr), "dd MMM yyyy");
};

export const formatDateShort = (dateStr: string): string => {
  return format(parseISO(dateStr), "dd MMM");
};

// Filter expenses by period
export const filterByToday = (expenses: Expense[]): Expense[] => {
  const now = new Date();
  const start = startOfDay(now);
  const end = endOfDay(now);
  return expenses.filter((e) =>
    isWithinInterval(parseISO(e.date), { start, end })
  );
};

export const filterByMonth = (
  expenses: Expense[],
  date: Date = new Date()
): Expense[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return expenses.filter((e) =>
    isWithinInterval(parseISO(e.date), { start, end })
  );
};

export const filterByYear = (
  expenses: Expense[],
  date: Date = new Date()
): Expense[] => {
  const start = startOfYear(date);
  const end = endOfYear(date);
  return expenses.filter((e) =>
    isWithinInterval(parseISO(e.date), { start, end })
  );
};

export const getTotalAmount = (expenses: Expense[]): number => {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
};

export const getIncome = (expenses: Expense[]): number => {
  return expenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
};

export const getExpenseTotal = (expenses: Expense[]): number => {
  return expenses
    .filter((e) => e.type !== "income")
    .reduce((sum, e) => sum + e.amount, 0);
};

// Group expenses by category with totals
export const groupByCategory = (
  expenses: Expense[],
  customCategories: CategoryInfo[] = []
): { category: string; total: number; count: number }[] => {
  const map = new Map<string, { total: number; count: number }>();

  expenses.forEach((e) => {
    const existing = map.get(e.category) || { total: 0, count: 0 };
    map.set(e.category, {
      total: existing.total + e.amount,
      count: existing.count + 1,
    });
  });

  return Array.from(map.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.total - a.total);
};

// Monthly totals for the year
export const getMonthlyTotals = (
  expenses: Expense[],
  year: number = new Date().getFullYear()
): { month: string; total: number }[] => {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  const months = eachMonthOfInterval({ start, end });

  return months.map((monthDate) => {
    const monthExpenses = filterByMonth(expenses, monthDate);
    return {
      month: format(monthDate, "MMM"),
      total: getTotalAmount(monthExpenses),
    };
  });
};

// Generate text report
export const generateTextReport = (
  expenses: Expense[],
  title: string,
  customCategories: CategoryInfo[] = []
): string => {
  const income = getIncome(expenses);
  const spent = getExpenseTotal(expenses);
  const byCategory = groupByCategory(expenses, customCategories);

  let report = `${title}\n`;
  report += `${"─".repeat(30)}\n`;
  report += `Income: ${formatCurrency(income)}\n`;
  report += `Spent: ${formatCurrency(spent)}\n`;
  report += `Net: ${formatCurrency(income - spent)}\n`;
  report += `Transactions: ${expenses.length}\n\n`;
  report += `Category Breakdown:\n`;

  byCategory.forEach(({ category, total: catTotal, count }) => {
    const cat = getCategoryInfo(category, customCategories);
    const total = getTotalAmount(expenses);
    const pct = total > 0 ? ((catTotal / total) * 100).toFixed(1) : "0";
    report += `  ${cat.label}: ${formatCurrency(catTotal)} (${pct}%) - ${count} items\n`;
  });

  report += `\n${"─".repeat(30)}\n`;
  report += `Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}`;

  return report;
};
