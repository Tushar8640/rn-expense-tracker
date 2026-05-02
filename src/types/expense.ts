export type TransactionType = "expense" | "income";

export interface Expense {
  id: string;
  type: TransactionType;
  amount: number;
  category: string; // now a string key, supports custom categories
  date: string; // ISO string
  note: string;
  receiptUri?: string;
  receiptName?: string;
  createdAt: string; // ISO string
}

export interface CategoryInfo {
  key: string;
  label: string;
  emoji: string;
  color: string;
  isCustom?: boolean;
}

export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { key: "food", label: "Food", emoji: "🍔", color: "#4B7A5B" },
  { key: "transport", label: "Transport", emoji: "🚗", color: "#5B8A6B" },
  { key: "shopping", label: "Shopping", emoji: "🛍️", color: "#E8A87C" },
  { key: "bills", label: "Bills", emoji: "📄", color: "#D4A574" },
  { key: "entertainment", label: "Entertainment", emoji: "🎬", color: "#E85D5D" },
  { key: "health", label: "Health", emoji: "💊", color: "#6BA3BE" },
  { key: "education", label: "Education", emoji: "📚", color: "#8B7EC8" },
  { key: "salary", label: "Salary", emoji: "💰", color: "#4B7A5B" },
  { key: "freelance", label: "Freelance", emoji: "💻", color: "#5B8A6B" },
  { key: "gift", label: "Gift", emoji: "🎁", color: "#E8A87C" },
  { key: "investment", label: "Investment", emoji: "📈", color: "#6BA3BE" },
  { key: "other", label: "Other", emoji: "📦", color: "#7A8F84" },
];

export const getCategoryInfo = (
  key: string,
  customCategories: CategoryInfo[] = []
): CategoryInfo => {
  const all = [...DEFAULT_CATEGORIES, ...customCategories];
  return all.find((c) => c.key === key) || { key, label: key, emoji: "📦", color: "#7A8F84" };
};
