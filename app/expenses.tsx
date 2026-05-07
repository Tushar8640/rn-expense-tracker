import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  Modal,
  Platform,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { getExpenses, deleteExpense, getCustomCategories } from "../src/storage/expenseStorage";
import { CategoryInfo, DEFAULT_CATEGORIES, Expense, TransactionType, getCategoryInfo } from "../src/types/expense";
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

type FilterType = "all" | "today" | "date" | "month" | "year";
type TypeFilter = "all" | TransactionType;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "date", label: "Date" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const now = new Date();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customCats, setCustomCats] = useState<CategoryInfo[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(now);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const router = useRouter();
  const allCategories = [...DEFAULT_CATEGORIES, ...customCats];

  const loadExpenses = useCallback(async () => {
    const [data, cats] = await Promise.all([getExpenses(), getCustomCategories()]);
    data.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setExpenses(data);
    setCustomCats(cats);
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
    const category = getCategoryInfo(expense.category, customCats);
    Alert.alert(
      "Delete Expense",
      `Delete ৳${expense.amount} from ${category.label}?`,
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

  const getPeriodExpenses = (): Expense[] => {
    const selectedPeriodDate = new Date(selectedYear, selectedMonth, 1);
    switch (filter) {
      case "today":
        return filterByToday(expenses);
      case "date":
        return expenses.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return (
            expenseDate.getFullYear() === selectedDate.getFullYear() &&
            expenseDate.getMonth() === selectedDate.getMonth() &&
            expenseDate.getDate() === selectedDate.getDate()
          );
        });
      case "month":
        return filterByMonth(expenses, selectedPeriodDate);
      case "year":
        return filterByYear(expenses, selectedPeriodDate);
      default:
        return expenses;
    }
  };

  const getFilteredExpenses = (): Expense[] => {
    const normalizedQuery = query.trim().toLowerCase();

    return getPeriodExpenses().filter((expense) => {
      const category = getCategoryInfo(expense.category, customCats);
      const matchesQuery =
        !normalizedQuery ||
        category.label.toLowerCase().includes(normalizedQuery) ||
        expense.note.toLowerCase().includes(normalizedQuery) ||
        expense.amount.toString().includes(normalizedQuery);

      const matchesType = typeFilter === "all" || expense.type === typeFilter;
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;

      return matchesQuery && matchesType && matchesCategory;
    });
  };

  const filtered = getFilteredExpenses();
  const total = getTotalAmount(filtered);
  const activeAdvancedFilterCount = [
    query.trim(),
    typeFilter !== "all",
    categoryFilter !== "all",
  ].filter(Boolean).length;
  const availableYears = (() => {
    const years = new Set<number>();
    expenses.forEach((e) => years.add(new Date(e.date).getFullYear()));
    years.add(now.getFullYear());
    years.add(now.getFullYear() - 1);
    years.add(now.getFullYear() - 2);
    return Array.from(years).sort((a, b) => b - a);
  })();

  const goToPrevPeriod = () => {
    if (filter === "date") {
      setSelectedDate((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
    } else if (filter === "month") {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear((y) => y - 1);
      } else {
        setSelectedMonth((m) => m - 1);
      }
    } else if (filter === "year") {
      setSelectedYear((y) => y - 1);
    }
  };

  const goToNextPeriod = () => {
    if (filter === "date") {
      setSelectedDate((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
    } else if (filter === "month") {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear((y) => y + 1);
      } else {
        setSelectedMonth((m) => m + 1);
      }
    } else if (filter === "year") {
      setSelectedYear((y) => y + 1);
    }
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

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

      <View style={s.advancedWrap}>
        <View style={[s.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search note, category, amount"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(["all", "expense", "income"] as TypeFilter[]).map((item) => {
            const active = typeFilter === item;
            return (
              <TouchableOpacity
                key={item}
                onPress={() => setTypeFilter(item)}
                style={[
                  s.smallPill,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  active && { backgroundColor: colors.pillActiveBg, borderColor: colors.pillActiveBg },
                ]}
              >
                <Text style={[s.smallPillText, { color: colors.textSecondary }, active && { color: colors.pillActiveText }]}>
                  {item === "all" ? "Any type" : item === "income" ? "Income" : "Expense"}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={() => setShowCategoryPicker(true)}
            style={[s.smallPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Text style={[s.smallPillText, { color: colors.textSecondary }]}>
              {categoryFilter === "all" ? "Any category" : getCategoryInfo(categoryFilter, customCats).label}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {activeAdvancedFilterCount > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery("");
              setTypeFilter("all");
              setCategoryFilter("all");
            }}
            style={[s.clearFilterBtn, { backgroundColor: colors.dangerLight }]}
          >
            <Text style={[s.clearFilterText, { color: colors.danger }]}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {(filter === "date" || filter === "month" || filter === "year") && (
        <View style={s.periodSelector}>
          <TouchableOpacity
            onPress={goToPrevPeriod}
            style={[s.arrowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Text style={[s.arrowText, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>

          {filter === "date" ? (
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[s.datePeriodBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Text style={[s.periodDayText, { color: colors.textSecondary }]}>{format(selectedDate, "EEEE")}</Text>
              <View style={s.periodDateRow}>
                <Text style={[s.periodBtnText, { color: colors.text, fontSize: 17 }]}>
                  {format(selectedDate, "dd MMM yyyy")}
                </Text>
                <Text style={[s.periodDropdown, { color: colors.textMuted }]}>▾</Text>
              </View>
            </TouchableOpacity>
          ) : filter === "month" ? (
            <View style={s.periodCenter}>
              <TouchableOpacity
                onPress={() => setShowMonthPicker(true)}
                style={[s.periodBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Text style={[s.periodBtnText, { color: colors.text }]}>{MONTHS[selectedMonth]}</Text>
                <Text style={[s.periodDropdown, { color: colors.textMuted }]}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowYearPicker(true)}
                style={[s.periodBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Text style={[s.periodBtnText, { color: colors.text }]}>{selectedYear}</Text>
                <Text style={[s.periodDropdown, { color: colors.textMuted }]}>▾</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowYearPicker(true)}
              style={[s.periodBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingHorizontal: 24 }]}
            >
              <Text style={[s.periodBtnText, { color: colors.text, fontSize: 18 }]}>{selectedYear}</Text>
              <Text style={[s.periodDropdown, { color: colors.textMuted }]}>▾</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={goToNextPeriod}
            style={[s.arrowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Text style={[s.arrowText, { color: colors.primary }]}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="calendar"
          onChange={handleDateChange}
        />
      )}

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
              customCategories={customCats}
              onEdit={() => router.push({ pathname: "/edit", params: { id: expense.id } })}
              onDelete={() => handleDelete(expense)}
            />
          ))
        ) : (
          <EmptyState
            title="No expenses found"
            subtitle={
              filter === "all"
                ? "Add your first expense to get started"
                : `No expenses for this ${filter} period`
            }
          />
        )}
      </ScrollView>

      <Modal visible={showMonthPicker} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setShowMonthPicker(false)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[s.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Select Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Text style={[s.modalDone, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={MONTHS.map((name, index) => ({ name, index }))}
              keyExtractor={(item) => item.name}
              numColumns={3}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isActive = selectedMonth === item.index;
                return (
                  <TouchableOpacity
                    style={[
                      s.monthCell,
                      { backgroundColor: colors.bg },
                      isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => {
                      setSelectedMonth(item.index);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        s.monthCellText,
                        { color: colors.text },
                        isActive && s.monthCellTextActive,
                      ]}
                    >
                      {item.name.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[s.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Text style={[s.modalDone, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ key: "all", label: "Any category", emoji: "📦", color: colors.textMuted }, ...allCategories]}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => {
                const isActive = categoryFilter === item.key;
                return (
                  <TouchableOpacity
                    style={[s.categoryRow, isActive && { backgroundColor: `${colors.primaryLight}60` }]}
                    onPress={() => {
                      setCategoryFilter(item.key);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                    <Text style={[s.categoryRowText, { color: colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {Platform.OS === "ios" && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <Pressable style={s.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={[s.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
              <View style={[s.modalHeader, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[s.modalTitle, { color: colors.text }]}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[s.modalDone, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="inline"
                onChange={handleDateChange}
                style={{ height: 340 }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      <Modal visible={showYearPicker} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setShowYearPicker(false)}>
          <Pressable style={[s.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[s.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <Text style={[s.modalDone, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableYears}
              keyExtractor={(item) => item.toString()}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item: year }) => {
                const isActive = selectedYear === year;
                return (
                  <TouchableOpacity
                    style={[
                      s.yearRow,
                      { borderBottomColor: colors.bg },
                      isActive && { backgroundColor: `${colors.primaryLight}40` },
                    ]}
                    onPress={() => {
                      setSelectedYear(year);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        s.yearRowText,
                        { color: colors.text },
                        isActive && { color: colors.primary, fontWeight: "700" },
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  advancedWrap: {
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    padding: 0,
  },
  smallPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 13,
    borderWidth: 1.5,
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  clearFilterBtn: {
    height: 42,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: "800",
  },
  periodSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  arrowText: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: -2,
  },
  periodCenter: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  periodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  periodBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  datePeriodBtn: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  periodDayText: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  periodDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  periodDropdown: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalDone: {
    fontSize: 16,
    fontWeight: "700",
  },
  monthCell: {
    flex: 1,
    margin: 4,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  monthCellText: {
    fontSize: 15,
    fontWeight: "600",
  },
  monthCellTextActive: {
    color: "#FFFFFF",
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  yearRowText: {
    fontSize: 17,
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  categoryRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
});
