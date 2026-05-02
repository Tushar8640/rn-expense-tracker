import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { getExpenses, deleteExpense } from "../src/storage/expenseStorage";
import { Expense } from "../src/types/expense";
import {
  filterByToday,
  filterByMonth,
  filterByYear,
  getTotalAmount,
  formatCurrency,
} from "../src/utils/helpers";
import ExpenseItem from "../src/components/ExpenseItem";
import EmptyState from "../src/components/EmptyState";
import { useTheme } from "../src/context/ThemeContext";

type FilterType = "all" | "today" | "month" | "year";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadExpenses = useCallback(async () => {
    const data = await getExpenses();
    data.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setExpenses(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert(
      "Delete Expense",
      `Delete ৳${expense.amount} from ${expense.category}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteExpense(expense.id);
            await loadExpenses();
          },
        },
      ]
    );
  };

  const getFilteredExpenses = (): Expense[] => {
    switch (filter) {
      case "today":
        return filterByToday(expenses);
      case "month":
        return filterByMonth(expenses);
      case "year":
        return filterByYear(expenses);
      default:
        return expenses;
    }
  };

  const filtered = getFilteredExpenses();
  const total = getTotalAmount(filtered);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Expenses</Text>
        <Text style={[s.subtitle, { color: colors.textSecondary }]}>
          {filtered.length} transactions · {formatCurrency(total)}
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        style={{ marginBottom: 16, flexGrow: 0 }}
      >
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                s.pill,
                { backgroundColor: colors.pillBg, borderColor: colors.cardBorder },
                isActive && { backgroundColor: colors.pillActiveBg, borderColor: colors.pillActiveBg },
              ]}
            >
              <Text
                style={[
                  s.pillText,
                  { color: colors.textSecondary },
                  isActive && { color: colors.pillActiveText },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Expense List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length > 0 ? (
          filtered.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onEdit={() => router.push({ pathname: "/edit", params: { id: expense.id } })}
              onDelete={() => handleDelete(expense)}
            />
          ))
        ) : (
          <EmptyState
            emoji="🔍"
            title="No expenses found"
            subtitle={
              filter === "all"
                ? "Add your first expense to get started"
                : `No expenses for this ${filter} period`
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
