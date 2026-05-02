import AsyncStorage from "@react-native-async-storage/async-storage";

const BUDGETS_KEY = "category_budgets";

export interface BudgetLimit {
  categoryKey: string;
  amount: number;
  period: "monthly" | "yearly";
}

export const getBudgets = async (): Promise<BudgetLimit[]> => {
  try {
    const data = await AsyncStorage.getItem(BUDGETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveBudget = async (budget: BudgetLimit): Promise<void> => {
  const budgets = await getBudgets();
  const index = budgets.findIndex((b) => b.categoryKey === budget.categoryKey);
  if (index !== -1) {
    budgets[index] = budget;
  } else {
    budgets.push(budget);
  }
  await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
};

export const deleteBudget = async (categoryKey: string): Promise<void> => {
  const budgets = await getBudgets();
  const filtered = budgets.filter((b) => b.categoryKey !== categoryKey);
  await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(filtered));
};

export const getBudgetForCategory = async (categoryKey: string): Promise<BudgetLimit | null> => {
  const budgets = await getBudgets();
  return budgets.find((b) => b.categoryKey === categoryKey) || null;
};
