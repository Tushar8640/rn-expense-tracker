import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { deleteBudget, getBudgets, saveBudget, BudgetLimit } from "../src/storage/budgetStorage";
import { getCustomCategories, getExpenses } from "../src/storage/expenseStorage";
import { CategoryInfo, DEFAULT_CATEGORIES, Expense, getCategoryInfo } from "../src/types/expense";
import { filterByMonth, filterByYear, formatCurrency } from "../src/utils/helpers";
import { useTheme } from "../src/context/ThemeContext";
import EmptyState from "../src/components/EmptyState";
import KeyboardAwareBottomModal from "../src/components/KeyboardAwareBottomModal";

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customCats, setCustomCats] = useState<CategoryInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [menuBudget, setMenuBudget] = useState<BudgetLimit | null>(null);
  const [editingBudgetKey, setEditingBudgetKey] = useState<string | null>(null);
  const [budgetCat, setBudgetCat] = useState("food");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState<"monthly" | "yearly">("monthly");
  const allCats = [...DEFAULT_CATEGORIES, ...customCats];

  const loadData = useCallback(async () => {
    const [budgetData, expenseData, cats] = await Promise.all([
      getBudgets(),
      getExpenses(),
      getCustomCategories(),
    ]);
    setBudgets(budgetData);
    setExpenses(expenseData);
    setCustomCats(cats);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const rows = budgets
    .map((budget) => {
      const category = getCategoryInfo(budget.categoryKey, customCats);
      const periodExpenses = budget.period === "monthly" ? filterByMonth(expenses) : filterByYear(expenses);
      const spent = periodExpenses
        .filter((expense) => expense.type !== "income" && expense.category === budget.categoryKey)
        .reduce((sum, expense) => sum + expense.amount, 0);
      const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const remaining = budget.amount - spent;
      return { ...budget, category, spent, pct, remaining };
    })
    .sort((a, b) => b.pct - a.pct);

  const overLimit = rows.filter((row) => row.pct >= 100).length;
  const nearLimit = rows.filter((row) => row.pct >= 70 && row.pct < 100).length;

  const openAddForm = () => {
    setEditingBudgetKey(null);
    setBudgetCat("food");
    setBudgetAmount("");
    setBudgetPeriod("monthly");
    setShowBudgetForm(true);
  };

  const openEditForm = (budget: BudgetLimit) => {
    setMenuBudget(null);
    setEditingBudgetKey(budget.categoryKey);
    setBudgetCat(budget.categoryKey);
    setBudgetAmount(budget.amount.toString());
    setBudgetPeriod(budget.period);
    setShowBudgetForm(true);
  };

  const handleSaveBudget = async () => {
    const amount = parseFloat(budgetAmount);
    if (!budgetAmount || Number.isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid budget amount.");
      return;
    }

    if (editingBudgetKey && editingBudgetKey !== budgetCat) {
      await deleteBudget(editingBudgetKey);
    }

    await saveBudget({ categoryKey: budgetCat, amount, period: budgetPeriod });
    setShowBudgetForm(false);
    setEditingBudgetKey(null);
    setBudgetAmount("");
    await loadData();
  };

  const handleDeleteBudget = (categoryKey: string) => {
    setMenuBudget(null);
    const category = getCategoryInfo(categoryKey, customCats);
    Alert.alert("Remove Budget", `Remove budget for ${category.label}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteBudget(categoryKey);
          await loadData();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View>
            <Text style={[s.title, { color: colors.text }]}>Budgets</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>
              {budgets.length} limits · {overLimit} over · {nearLimit} warning
            </Text>
          </View>
          <TouchableOpacity
            onPress={openAddForm}
            style={[s.manageBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Text style={[s.manageText, { color: colors.primary }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {rows.length === 0 ? (
          <EmptyState title="No budgets set" subtitle="Add category limits to track spending progress" />
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {rows.map((row) => {
              const barColor = row.pct >= 100 ? colors.danger : row.pct >= 70 ? "#D4A017" : colors.primary;
              return (
                <View key={row.categoryKey} style={[s.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={s.cardTop}>
                    <View style={[s.iconBox, { backgroundColor: row.category.color + "15" }]}>
                      <Text style={{ fontSize: 20 }}>{row.category.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.category, { color: colors.text }]}>{row.category.label}</Text>
                      <Text style={[s.meta, { color: colors.textSecondary }]}>
                        {row.period === "monthly" ? "This month" : "This year"}
                      </Text>
                    </View>
                    <Text style={[s.percent, { color: barColor }]}>{row.pct.toFixed(0)}%</Text>
                    <TouchableOpacity
                      onPress={() => setMenuBudget(row)}
                      style={s.menuBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[s.menuDots, { color: colors.textMuted }]}>⋮</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[s.progressBg, { backgroundColor: colors.cardBorder }]}>
                    <View style={[s.progressFill, { width: `${Math.min(row.pct, 100)}%`, backgroundColor: barColor }]} />
                  </View>

                  <View style={s.amountRow}>
                    <Text style={[s.amountText, { color: colors.textSecondary }]}>
                      Spent {formatCurrency(row.spent)} of {formatCurrency(row.amount)}
                    </Text>
                    <Text style={[s.amountText, { color: row.remaining >= 0 ? colors.primary : colors.danger }]}>
                      {row.remaining >= 0 ? `${formatCurrency(row.remaining)} left` : `${formatCurrency(Math.abs(row.remaining))} over`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <KeyboardAwareBottomModal
        visible={showBudgetForm}
        onClose={() => setShowBudgetForm(false)}
        sheetStyle={[s.modalSheet, { backgroundColor: colors.card }]}
      >
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {editingBudgetKey ? "Edit Budget Limit" : "Set Budget Limit"}
            </Text>

            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
            <TouchableOpacity
              style={[s.inputCard, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
              onPress={() => setShowCatPicker(true)}
            >
              <Text style={{ fontSize: 18 }}>{getCategoryInfo(budgetCat, customCats).emoji}</Text>
              <Text style={[s.inputText, { color: colors.text }]}>{getCategoryInfo(budgetCat, customCats).label}</Text>
              <Text style={{ color: colors.textMuted }}>▾</Text>
            </TouchableOpacity>

            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Amount</Text>
            <TextInput
              style={[s.amountInput, { backgroundColor: colors.bg, borderColor: colors.cardBorder, color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
            />

            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Period</Text>
            <View style={s.periodRow}>
              {(["monthly", "yearly"] as const).map((period) => {
                const active = budgetPeriod === period;
                return (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setBudgetPeriod(period)}
                    style={[
                      s.periodBtn,
                      { backgroundColor: colors.bg, borderColor: colors.cardBorder },
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[s.periodText, { color: colors.textSecondary }, active && { color: "#FFFFFF" }]}>
                      {period === "monthly" ? "Monthly" : "Yearly"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity
                onPress={() => {
                  setShowBudgetForm(false);
                  setEditingBudgetKey(null);
                }}
                style={[s.cancelBtn, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
              >
                <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveBudget} style={[s.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={s.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
      </KeyboardAwareBottomModal>

      <Modal visible={menuBudget !== null} transparent animationType="fade">
        <Pressable style={s.popoverOverlay} onPress={() => setMenuBudget(null)}>
          <View style={[s.popoverCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={s.popoverItem}
              onPress={() => {
                if (menuBudget) openEditForm(menuBudget);
              }}
            >
              <Text style={[s.popoverLabel, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>
            <View style={[s.popoverDivider, { backgroundColor: colors.cardBorder }]} />
            <TouchableOpacity
              style={s.popoverItem}
              onPress={() => {
                if (menuBudget) handleDeleteBudget(menuBudget.categoryKey);
              }}
            >
              <Text style={[s.popoverLabel, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <KeyboardAwareBottomModal
        visible={showCatPicker}
        onClose={() => setShowCatPicker(false)}
        sheetStyle={[s.pickerSheet, { backgroundColor: colors.card }]}
      >
            <View style={[s.pickerHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCatPicker(false)}>
                <Text style={[s.doneText, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={allCats}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const active = budgetCat === item.key;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setBudgetCat(item.key);
                      setShowCatPicker(false);
                    }}
                    style={[s.categoryRow, active && { backgroundColor: `${colors.primaryLight}70` }]}
                  >
                    <View style={[s.categoryIcon, { backgroundColor: item.color + "15" }]}>
                      <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                    </View>
                    <Text style={[s.categoryRowText, { color: colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
      </KeyboardAwareBottomModal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  manageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  manageText: {
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  category: {
    fontSize: 15,
    fontWeight: "800",
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  percent: {
    fontSize: 16,
    fontWeight: "900",
  },
  menuBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  menuDots: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 14,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  amountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  amountInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 18,
    fontWeight: "800",
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  saveText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  doneText: {
    fontSize: 16,
    fontWeight: "800",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  popoverOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "flex-end",
    paddingTop: 120,
    paddingRight: 24,
  },
  popoverCard: {
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 150,
    paddingVertical: 6,
  },
  popoverItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  popoverIcon: {
    fontSize: 16,
  },
  popoverLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  popoverDivider: {
    height: 1,
    marginHorizontal: 12,
  },
});
