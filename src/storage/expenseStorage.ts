import AsyncStorage from "@react-native-async-storage/async-storage";
import { Expense, CategoryInfo } from "../types/expense";

const STORAGE_KEY = "expenses";
const CATEGORIES_KEY = "custom_categories";

// --- Expenses ---

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveExpense = async (expense: Expense): Promise<void> => {
  const expenses = await getExpenses();
  expenses.push(expense);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
};

export const deleteExpense = async (id: string): Promise<void> => {
  const expenses = await getExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const updateExpense = async (updated: Expense): Promise<void> => {
  const expenses = await getExpenses();
  const index = expenses.findIndex((e) => e.id === updated.id);
  if (index !== -1) {
    expenses[index] = updated;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }
};

export const clearAllExpenses = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

// --- Custom Categories ---

export const getCustomCategories = async (): Promise<CategoryInfo[]> => {
  try {
    const data = await AsyncStorage.getItem(CATEGORIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveCustomCategory = async (cat: CategoryInfo): Promise<void> => {
  const cats = await getCustomCategories();
  cats.push({ ...cat, isCustom: true });
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
};

export const deleteCustomCategory = async (key: string): Promise<void> => {
  const cats = await getCustomCategories();
  const filtered = cats.filter((c) => c.key !== key);
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered));
};

export const updateCustomCategory = async (updated: CategoryInfo): Promise<void> => {
  const cats = await getCustomCategories();
  const index = cats.findIndex((c) => c.key === updated.key);
  if (index !== -1) {
    cats[index] = { ...updated, isCustom: true };
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  }
};
