import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useTheme } from "../src/context/ThemeContext";
import { getExpenses, getCustomCategories, deleteExpense } from "../src/storage/expenseStorage";
import { getBudgets, BudgetLimit } from "../src/storage/budgetStorage";
import {
  isNotificationsEnabled,
  requestNotificationPermissions,
  scheduleDailyReminders,
  cancelDailyReminders,
} from "../src/storage/notificationService";
import { Expense, CategoryInfo, getCategoryInfo } from "../src/types/expense";
import {
  filterByToday,
  filterByMonth,
  filterByYear,
  getIncome,
  getExpenseTotal,
  formatCurrency,
  formatCompactCurrency,
  groupByCategory,
} from "../src/utils/helpers";
import { format } from "date-fns";
import DonutChart from "../src/components/DonutChart";
import ExpenseItem from "../src/components/ExpenseItem";
import EmptyState from "../src/components/EmptyState";

type FilterType = "all" | "daily" | "weekly" | "monthly";

export default function HomeScreen() {
  const { colors } = useTheme();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customCats, setCustomCats] = useState<CategoryInfo[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const router = useRouter();
  const CARD_WIDTH = Dimensions.get("window").width - 40; // 20px margin each side

  const loadData = useCallback(async () => {
    const [data, cats, b] = await Promise.all([getExpenses(), getCustomCategories(), getBudgets()]);
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setExpenses(data);
    setCustomCats(cats);
    setBudgets(b);
    const ne = await isNotificationsEnabled();
    setNotifEnabled(ne);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const getFiltered = () => {
    switch (filter) {
      case "daily": return filterByToday(expenses);
      case "monthly": return filterByMonth(expenses);
      case "weekly": {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        return expenses.filter((e) => new Date(e.date) >= weekAgo);
      }
      default: return expenses;
    }
  };

  const filtered = getFiltered();
  const income = getIncome(filtered);
  const spent = getExpenseTotal(filtered);
  const recentExpenses = filtered.slice(0, 5);

  // Monthly data for balance card
  const allMonthExpenses = filterByMonth(expenses);
  const monthIncome = getIncome(allMonthExpenses);
  const monthSpent = getExpenseTotal(allMonthExpenses);
  const monthBalance = monthIncome - monthSpent;
  const monthTransactions = allMonthExpenses.length;

  const monthExpenses = filterByMonth(expenses).filter((e) => e.type !== "income");
  const yearExpenses = filterByYear(expenses).filter((e) => e.type !== "income");

  // Budget warnings
  const budgetWarnings = budgets.map((b) => {
    const cat = getCategoryInfo(b.categoryKey, customCats);
    const relevantExpenses = b.period === "monthly" ? monthExpenses : yearExpenses;
    const catSpent = relevantExpenses.filter((e) => e.category === b.categoryKey).reduce((s, e) => s + e.amount, 0);
    const pct = b.amount > 0 ? (catSpent / b.amount) * 100 : 0;
    return { ...b, cat, catSpent, pct };
  }).filter((w) => w.pct >= 70);

  const donutData = [
    { label: "Income", value: income || 0, color: "#4B7A5B" },
    { label: "Spent", value: spent || 0, color: "#E8A87C" },
  ];

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" }, { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" }, { key: "monthly", label: "Monthly" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 8 }}>
          <View>
            <Text style={{ fontSize: 28, color: colors.text, fontWeight: "400" }}>Hello,</Text>
            <Text style={{ fontSize: 28, color: colors.text, fontWeight: "800" }}>Welcome back 👋</Text>
          </View>
          <TouchableOpacity
            onPress={async () => {
              if (notifEnabled) {
                await cancelDailyReminders();
                setNotifEnabled(false);
                Alert.alert("Notifications Off", "Daily reminders disabled.");
              } else {
                const granted = await requestNotificationPermissions();
                if (granted) {
                  await scheduleDailyReminders();
                  setNotifEnabled(true);
                  Alert.alert("Notifications On 🔔", "You'll get reminders at 8 AM and 9 PM daily.");
                } else {
                  Alert.alert("Permission Denied", "Please enable notifications in your phone settings.");
                }
              }
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              backgroundColor: notifEnabled ? colors.primaryLight : colors.card,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: notifEnabled ? colors.primary : colors.cardBorder,
            }}
          >
            <Text style={{ fontSize: 18 }}>{notifEnabled ? "🔔" : "🔕"}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} style={{ marginTop: 20 }}>
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, backgroundColor: active ? colors.pillActiveBg : colors.pillBg, borderWidth: 1.5, borderColor: active ? colors.pillActiveBg : colors.cardBorder }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: active ? colors.pillActiveText : colors.textSecondary }}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Card Slider */}
        <View style={{ marginTop: 20 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 20 }}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const x = e.nativeEvent.contentOffset.x;
              setActiveCard(Math.round(x / (CARD_WIDTH + 12)));
            }}
            scrollEventThrottle={16}
          >
            {/* Card 1: Income & Spent with Donut */}
            <View style={[cs.card, { width: CARD_WIDTH, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: "#4B7A5B" }} />
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "500" }}>Income</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 1, marginLeft: 8 }}>{formatCurrency(income)}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
                  <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: "#E8A87C" }} />
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "500" }}>Spent</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 1, marginLeft: 8 }}>{formatCurrency(spent)}</Text>
              </View>
              <DonutChart
                data={income > 0 || spent > 0 ? donutData : [{ label: "Empty", value: 1, color: colors.cardBorder }]}
                size={100}
                strokeWidth={14}
                centerLabel="Net"
                centerValue={formatCompactCurrency(income - spent)}
              />
            </View>

            <View style={{ width: 12 }} />

            {/* Card 2: Balance Card (Credit/Debit card style) */}
            <View style={[cs.balanceCard, { width: CARD_WIDTH }]}>
              {/* Card chip & logo */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={cs.chip}>
                  <View style={cs.chipLine} />
                  <View style={cs.chipLine} />
                  <View style={cs.chipLine} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", letterSpacing: 1 }}>EXPENSE TRACKER</Text>
              </View>

              {/* Balance */}
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: "500", letterSpacing: 0.5 }}>CURRENT BALANCE</Text>
                <Text style={{ fontSize: 26, fontWeight: "800", color: "#FFFFFF", marginTop: 2 }}>{formatCurrency(monthBalance)}</Text>
              </View>

              {/* Card details row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                <View>
                  <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontWeight: "500", letterSpacing: 0.5 }}>MONTH</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF", marginTop: 1 }}>{format(new Date(), "MMMM yyyy")}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", fontWeight: "500", letterSpacing: 0.5 }}>TRANSACTIONS</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF", marginTop: 1 }}>{monthTransactions}</Text>
                </View>
              </View>

              {/* Bottom row: income/spent mini */}
              <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#A8E6CF" }} />
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "500" }}>In: {formatCurrency(monthIncome)}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFB3B3" }} />
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "500" }}>Out: {formatCurrency(monthSpent)}</Text>
                </View>
              </View>

              {/* Decorative circles */}
              <View style={cs.decoCircle1} />
              <View style={cs.decoCircle2} />
            </View>
          </ScrollView>

          {/* Dot indicators */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 }}>
            {[0, 1].map((i) => (
              <View
                key={i}
                style={{
                  width: activeCard === i ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: activeCard === i ? colors.primary : colors.cardBorder,
                }}
              />
            ))}
          </View>
        </View>

        {/* Budget Warnings */}
        {budgetWarnings.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 10 }}>⚠️ Budget Alerts</Text>
            {budgetWarnings.map((w) => (
              <View key={w.categoryKey} style={{ backgroundColor: w.pct >= 100 ? colors.dangerLight : "#FFF8E1", borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: w.pct >= 100 ? colors.danger + "30" : "#F5E6B8" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{w.cat.emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.text }}>{w.cat.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: w.pct >= 100 ? colors.danger : "#D4A017" }}>{w.pct.toFixed(0)}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                  <View style={{ height: "100%", borderRadius: 3, width: `${Math.min(w.pct, 100)}%`, backgroundColor: w.pct >= 100 ? colors.danger : "#D4A017" }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>{formatCurrency(w.catSpent)} of {formatCurrency(w.amount)} ({w.period})</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Recent transactions</Text>
            <TouchableOpacity onPress={() => router.push("/expenses")} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.primaryLight }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>See All →</Text>
            </TouchableOpacity>
          </View>
          {recentExpenses.length > 0 ? (
            recentExpenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                customCategories={customCats}
                onEdit={() => router.push({ pathname: "/edit", params: { id: expense.id } })}
                onDelete={() => Alert.alert("Delete?", `Delete this transaction?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: async () => { await deleteExpense(expense.id); await loadData(); }},
                ])}
              />
            ))
          ) : (
            <EmptyState emoji="💰" title="No transactions yet" subtitle="Tap + to add your first transaction" />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const cs = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
  },
  balanceCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#1A2B23",
    overflow: "hidden",
    position: "relative",
  },
  chip: {
    width: 32,
    height: 24,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    paddingHorizontal: 3,
    gap: 2,
  },
  chipLine: {
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1,
  },
  decoCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(75, 122, 91, 0.15)",
    top: -40,
    right: -40,
  },
  decoCircle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(75, 122, 91, 0.1)",
    bottom: -30,
    left: -20,
  },
});
