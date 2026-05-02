import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { format, getDaysInMonth } from "date-fns";
import { getExpenses, getCustomCategories } from "../src/storage/expenseStorage";
import { Expense, CategoryInfo } from "../src/types/expense";
import {
  filterByMonth,
  filterByYear,
  getTotalAmount,
  getIncome,
  getExpenseTotal,
  formatCurrency,
  groupByCategory,
  getMonthlyTotals,
  generateTextReport,
} from "../src/utils/helpers";
import BarChart from "../src/components/BarChart";
import CategoryBreakdown from "../src/components/CategoryBreakdown";
import SummaryCard from "../src/components/SummaryCard";
import EmptyState from "../src/components/EmptyState";
import { useTheme } from "../src/context/ThemeContext";
import { exportPrintableReport, exportTransactionsCsv } from "../src/storage/reportExportService";

type ReportType = "monthly" | "yearly";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ReportsScreen() {
  const { colors } = useTheme();
  const now = new Date();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customCats, setCustomCats] = useState<CategoryInfo[]>([]);
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [refreshing, setRefreshing] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const loadExpenses = useCallback(async () => {
    const data = await getExpenses();
    data.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setExpenses(data);
    const cats = await getCustomCategories();
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

  // Build the selected date
  const selectedDate = new Date(selectedYear, selectedMonth, 1);

  const monthExpenses = filterByMonth(expenses, selectedDate);
  const yearExpenses = filterByYear(expenses, selectedDate);

  const currentExpenses =
    reportType === "monthly" ? monthExpenses : yearExpenses;
  const currentTotal = getTotalAmount(currentExpenses);
  const currentIncome = getIncome(currentExpenses);
  const currentSpent = getExpenseTotal(currentExpenses);
  const categoryData = groupByCategory(currentExpenses, customCats);
  const monthlyTotals = getMonthlyTotals(expenses, selectedYear);

  // Calculate days elapsed for average
  const daysInSelectedMonth = getDaysInMonth(selectedDate);
  const isCurrentMonth =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const isCurrentYear = selectedYear === now.getFullYear();

  const daysElapsed =
    reportType === "monthly"
      ? isCurrentMonth
        ? now.getDate()
        : daysInSelectedMonth
      : isCurrentYear
        ? Math.floor(
            (now.getTime() - new Date(selectedYear, 0, 1).getTime()) / 86400000
          ) + 1
        : 365;

  const avgPerDay = currentTotal / (daysElapsed || 1);

  // Available years from data
  const availableYears = (() => {
    const years = new Set<number>();
    expenses.forEach((e) => years.add(new Date(e.date).getFullYear()));
    years.add(now.getFullYear());
    // Add a couple extra years for navigation
    years.add(now.getFullYear() - 1);
    years.add(now.getFullYear() - 2);
    return Array.from(years).sort((a, b) => b - a);
  })();

  const handleShareReport = async () => {
    const title =
      reportType === "monthly"
        ? `Monthly Report - ${format(selectedDate, "MMMM yyyy")}`
        : `Yearly Report - ${selectedYear}`;

    const report = generateTextReport(currentExpenses, title, customCats);

    try {
      await Share.share({ message: report, title });
    } catch {
      Alert.alert("Error", "Failed to share report.");
    }
  };

  const getReportTitle = () =>
    reportType === "monthly"
      ? `Monthly Report - ${format(selectedDate, "MMMM yyyy")}`
      : `Yearly Report - ${selectedYear}`;

  const handleExportCsv = async () => {
    const result = await exportTransactionsCsv(currentExpenses, getReportTitle(), customCats);
    if (!result.success) Alert.alert("Export failed", result.message);
  };

  const handleExportPrintable = async () => {
    const result = await exportPrintableReport(currentExpenses, getReportTitle(), customCats);
    if (!result.success) Alert.alert("Export failed", result.message);
  };

  const goToPrevPeriod = () => {
    if (reportType === "monthly") {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear((y) => y - 1);
      } else {
        setSelectedMonth((m) => m - 1);
      }
    } else {
      setSelectedYear((y) => y - 1);
    }
  };

  const goToNextPeriod = () => {
    if (reportType === "monthly") {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear((y) => y + 1);
      } else {
        setSelectedMonth((m) => m + 1);
      }
    } else {
      setSelectedYear((y) => y + 1);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.text }]}>Reports</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>Analyze your spending</Text>
        </View>

        {/* Report Type Toggle */}
        <View style={s.toggleRow}>
          {(["monthly", "yearly"] as ReportType[]).map((type) => {
            const isActive = reportType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setReportType(type)}
                style={[
                  s.toggleBtn,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  isActive && { backgroundColor: colors.pillActiveBg, borderColor: colors.pillActiveBg },
                ]}
              >
                <Text
                  style={[
                    s.toggleText,
                    { color: colors.textSecondary },
                    isActive && { color: colors.pillActiveText },
                  ]}
                >
                  {type === "monthly" ? "📅 Monthly" : "📆 Yearly"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Period Selector */}
        <View style={s.periodSelector}>
          <TouchableOpacity
            onPress={goToPrevPeriod}
            style={[s.arrowBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Text style={[s.arrowText, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>

          {reportType === "monthly" ? (
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

        {currentExpenses.length === 0 ? (
          <EmptyState
            emoji="📊"
            title="No data for this period"
            subtitle={
              reportType === "monthly"
                ? `No transactions in ${MONTHS[selectedMonth]} ${selectedYear}`
                : `No transactions in ${selectedYear}`
            }
          />
        ) : (
          <>
            {/* Summary */}
            <View style={s.cardsRow}>
              <SummaryCard
                title="Income"
                amount={formatCurrency(currentIncome)}
                subtitle={`${currentExpenses.filter((e) => e.type === "income").length} items`}
                color="#4B7A5B"
                indicator="yes"
              />
              <SummaryCard
                title="Spent"
                amount={formatCurrency(currentSpent)}
                subtitle={`${currentExpenses.filter((e) => e.type !== "income").length} items`}
                color="#E85D5D"
                indicator="yes"
              />
            </View>

            <View style={[s.cardsRow, { marginTop: 8 }]}>
              <SummaryCard
                title="Net"
                amount={formatCurrency(currentIncome - currentSpent)}
                color={currentIncome - currentSpent >= 0 ? "#4B7A5B" : "#E85D5D"}
                indicator="yes"
              />
              <SummaryCard
                title="Daily Avg"
                amount={formatCurrency(Math.round(avgPerDay))}
                subtitle="per day"
                color="#7A8F84"
                indicator="yes"
              />
            </View>

            {/* Charts */}
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>
                {reportType === "yearly" ? "Monthly Trend" : "Top Categories"}
              </Text>
              <BarChart
                data={
                  reportType === "yearly"
                    ? monthlyTotals.map((m) => ({
                        label: m.month,
                        value: m.total,
                      }))
                    : categoryData.slice(0, 6).map((c) => ({
                        label: c.category.slice(0, 4),
                        value: c.total,
                      }))
                }
                barColor="#4B7A5B"
              />
            </View>

            {/* Category Breakdown */}
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
              <CategoryBreakdown
                data={categoryData}
                grandTotal={currentTotal}
                customCategories={customCats}
              />
            </View>

            {/* Share Button */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <TouchableOpacity
                onPress={handleShareReport}
                style={[s.shareBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={s.shareBtnText}>Share Report 📤</Text>
              </TouchableOpacity>
              <View style={s.exportRow}>
                <TouchableOpacity
                  onPress={handleExportCsv}
                  style={[s.exportBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.exportBtnText, { color: colors.text }]}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleExportPrintable}
                  style={[s.exportBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.exportBtnText, { color: colors.text }]}>Printable</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Month Picker Modal */}
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

      {/* Year Picker Modal */}
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
                    {isActive && (
                      <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>
                    )}
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
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Period selector
  periodSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
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
  periodDropdown: {
    fontSize: 14,
  },
  cardsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  shareBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  exportRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1.5,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
  // Modals
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
});
