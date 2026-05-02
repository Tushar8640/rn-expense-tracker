import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
  Pressable,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { format, parseISO } from "date-fns";
import { useTheme } from "../src/context/ThemeContext";
import {
  createManualBackup,
  importBackup,
  listAutoBackups,
  restoreAutoBackup,
  deleteAutoBackup,
  runAutoBackupIfNeeded,
  BackupInfo,
} from "../src/storage/backupService";
import {
  getBudgets,
  saveBudget,
  deleteBudget,
  BudgetLimit,
} from "../src/storage/budgetStorage";
import {
  getRecurringTransactions,
  saveRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringActive,
  RecurringTransaction,
  RecurrencePattern,
} from "../src/storage/recurringService";
import { DEFAULT_CATEGORIES, getCategoryInfo } from "../src/types/expense";
import { getCustomCategories } from "../src/storage/expenseStorage";
import { CategoryInfo, TransactionType } from "../src/types/expense";
import { generateId, formatCurrency } from "../src/utils/helpers";

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [customCats, setCustomCats] = useState<CategoryInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Budget form
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetCat, setBudgetCat] = useState("food");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState<"monthly" | "yearly">("monthly");

  // Recurring form
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recType, setRecType] = useState<TransactionType>("expense");
  const [recAmount, setRecAmount] = useState("");
  const [recCategory, setRecCategory] = useState("food");
  const [recNote, setRecNote] = useState("");
  const [recPattern, setRecPattern] = useState<RecurrencePattern>("monthly");

  // Category picker
  const [showCatPicker, setShowCatPicker] = useState<"budget" | "recurring" | null>(null);

  const loadAll = useCallback(async () => {
    const [b, bu, r, cc] = await Promise.all([
      listAutoBackups(),
      getBudgets(),
      getRecurringTransactions(),
      getCustomCategories(),
    ]);
    setBackups(b);
    setBudgets(bu);
    setRecurring(r);
    setCustomCats(cc);
  }, []);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const allCats = [...DEFAULT_CATEGORIES, ...customCats];

  // --- Backup handlers ---
  const handleManualBackup = async () => {
    setLoading("backup");
    const result = await createManualBackup();
    setLoading(null);
    Alert.alert(result.success ? "Backup Created ✅" : "Failed", result.message);
  };

  const handleImport = () => {
    Alert.alert("Import Backup", "This will replace ALL current data. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Import", style: "destructive", onPress: async () => {
        setLoading("import");
        const result = await importBackup();
        setLoading(null);
        if (result.success) { Alert.alert("Restored ✅", result.message); await loadAll(); }
        else if (result.message !== "No file selected.") Alert.alert("Failed", result.message);
      }},
    ]);
  };

  // --- Budget handlers ---
  const handleSaveBudget = async () => {
    const amt = parseFloat(budgetAmount);
    if (!budgetAmount || isNaN(amt) || amt <= 0) {
      Alert.alert("Error", "Enter a valid amount.");
      return;
    }
    await saveBudget({ categoryKey: budgetCat, amount: amt, period: budgetPeriod });
    setShowBudgetForm(false);
    setBudgetAmount("");
    await loadAll();
  };

  const handleDeleteBudget = (catKey: string) => {
    const cat = getCategoryInfo(catKey, customCats);
    Alert.alert("Remove Budget", `Remove budget for ${cat.label}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await deleteBudget(catKey); await loadAll(); }},
    ]);
  };

  // --- Recurring handlers ---
  const handleSaveRecurring = async () => {
    const amt = parseFloat(recAmount);
    if (!recAmount || isNaN(amt) || amt <= 0) {
      Alert.alert("Error", "Enter a valid amount.");
      return;
    }
    await saveRecurringTransaction({
      id: generateId(),
      type: recType,
      amount: amt,
      category: recCategory,
      note: recNote.trim(),
      pattern: recPattern,
      startDate: new Date().toISOString(),
      isActive: true,
    });
    setShowRecurringForm(false);
    setRecAmount("");
    setRecNote("");
    await loadAll();
  };

  const handleDeleteRecurring = (rt: RecurringTransaction) => {
    Alert.alert("Delete Recurring", `Delete this recurring ${rt.type}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteRecurringTransaction(rt.id); await loadAll(); }},
    ]);
  };

  const handleToggleRecurring = async (id: string) => {
    await toggleRecurringActive(id);
    await loadAll();
  };

  const formatBackupDate = (d: string) => { try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; } };
  const formatSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  const patternLabels: Record<RecurrencePattern, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

  // Category picker modal
  const renderCatPicker = () => (
    <Modal visible={showCatPicker !== null} transparent animationType="slide">
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setShowCatPicker(null)}>
        <Pressable style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: "60%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCatPicker(null)}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary }}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={allCats}
            keyExtractor={(i) => i.key}
            renderItem={({ item }) => {
              const sel = showCatPicker === "budget" ? budgetCat : recCategory;
              const isActive = sel === item.key;
              return (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", padding: 14, paddingHorizontal: 20, gap: 12, backgroundColor: isActive ? colors.primaryLight : "transparent" }}
                  onPress={() => {
                    if (showCatPicker === "budget") setBudgetCat(item.key);
                    else setRecCategory(item.key);
                    setShowCatPicker(null);
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: item.color + "15", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: isActive ? "700" : "500", color: isActive ? colors.primary : colors.text }}>{item.label}</Text>
                  {isActive && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text }}>Settings</Text>
        </View>

        {/* Dark Mode Toggle */}
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginHorizontal: 20, marginTop: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 24 }}>{isDark ? "🌙" : "☀️"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Dark Mode</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{isDark ? "Dark theme active" : "Light theme active"}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#E8F0EB", true: "#4B7A5B" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Budget Limits */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>💰 Budget Limits</Text>
            <TouchableOpacity
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.primaryLight }}
              onPress={() => setShowBudgetForm(true)}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {budgets.length > 0 ? (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 12 }]}>
              {budgets.map((b, i) => {
                const cat = getCategoryInfo(b.categoryKey, customCats);
                return (
                  <View key={b.categoryKey}>
                    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: cat.color + "15", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{cat.label}</Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{formatCurrency(b.amount)} / {b.period}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteBudget(b.categoryKey)} style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: colors.dangerLight, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "700" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    {i < budgets.length - 1 && <View style={{ height: 1, backgroundColor: colors.cardBorder }} />}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>No budget limits set. Add one to track spending.</Text>
          )}
        </View>

        {/* Budget Form Modal */}
        {showBudgetForm && (
          <Modal transparent animationType="slide">
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setShowBudgetForm(false)}>
              <Pressable style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 }}>Set Budget Limit</Text>

                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>Category</Text>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 14 }}
                  onPress={() => setShowCatPicker("budget")}
                >
                  <Text style={{ fontSize: 18 }}>{getCategoryInfo(budgetCat, customCats).emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.text }}>{getCategoryInfo(budgetCat, customCats).label}</Text>
                  <Text style={{ color: colors.textMuted }}>▾</Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>Amount</Text>
                <TextInput
                  style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 14, fontSize: 18, fontWeight: "700", color: colors.text, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 14 }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={budgetAmount}
                  onChangeText={setBudgetAmount}
                />

                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>Period</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                  {(["monthly", "yearly"] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", backgroundColor: budgetPeriod === p ? colors.primary : colors.bg, borderWidth: 1, borderColor: budgetPeriod === p ? colors.primary : colors.cardBorder }}
                      onPress={() => setBudgetPeriod(p)}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "600", color: budgetPeriod === p ? "#FFF" : colors.textSecondary }}>{p === "monthly" ? "Monthly" : "Yearly"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.bg, alignItems: "center", borderWidth: 1, borderColor: colors.cardBorder }} onPress={() => setShowBudgetForm(false)}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center" }} onPress={handleSaveBudget}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* Recurring Transactions */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>🔄 Recurring</Text>
            <TouchableOpacity
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.primaryLight }}
              onPress={() => setShowRecurringForm(true)}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {recurring.length > 0 ? (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 12 }]}>
              {recurring.map((rt, i) => {
                const cat = getCategoryInfo(rt.category, customCats);
                return (
                  <View key={rt.id}>
                    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: cat.color + "15", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{cat.label} · {formatCurrency(rt.amount)}</Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{patternLabels[rt.pattern]} · {rt.type === "income" ? "Income" : "Expense"}{rt.note ? ` · ${rt.note}` : ""}</Text>
                      </View>
                      <Switch
                        value={rt.isActive}
                        onValueChange={() => handleToggleRecurring(rt.id)}
                        trackColor={{ false: colors.cardBorder, true: colors.primary }}
                        thumbColor="#FFF"
                        style={{ transform: [{ scale: 0.8 }] }}
                      />
                      <TouchableOpacity onPress={() => handleDeleteRecurring(rt)} style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: colors.dangerLight, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "700" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    {i < recurring.length - 1 && <View style={{ height: 1, backgroundColor: colors.cardBorder }} />}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>No recurring transactions. Add bills or salary that repeat.</Text>
          )}
        </View>

        {/* Recurring Form Modal */}
        {showRecurringForm && (
          <Modal transparent animationType="slide">
            <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setShowRecurringForm(false)}>
              <Pressable style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 }}>Add Recurring Transaction</Text>

                {/* Type */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                  {(["expense", "income"] as TransactionType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: recType === t ? (t === "income" ? colors.primaryLight : colors.dangerLight) : colors.bg, borderWidth: 1.5, borderColor: recType === t ? (t === "income" ? colors.primary : colors.danger) : colors.cardBorder }}
                      onPress={() => setRecType(t)}
                    >
                      <Text style={{ fontSize: 14 }}>{t === "income" ? "💰" : "💸"}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: recType === t ? (t === "income" ? colors.primary : colors.danger) : colors.textSecondary }}>{t === "income" ? "Income" : "Expense"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Amount */}
                <TextInput
                  style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 14, fontSize: 18, fontWeight: "700", color: colors.text, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 14 }}
                  placeholder="Amount"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={recAmount}
                  onChangeText={setRecAmount}
                />

                {/* Category */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 14 }}
                  onPress={() => setShowCatPicker("recurring")}
                >
                  <Text style={{ fontSize: 18 }}>{getCategoryInfo(recCategory, customCats).emoji}</Text>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.text }}>{getCategoryInfo(recCategory, customCats).label}</Text>
                  <Text style={{ color: colors.textMuted }}>▾</Text>
                </TouchableOpacity>

                {/* Pattern */}
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
                  {(["daily", "weekly", "monthly", "yearly"] as RecurrencePattern[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center", backgroundColor: recPattern === p ? colors.primary : colors.bg, borderWidth: 1, borderColor: recPattern === p ? colors.primary : colors.cardBorder }}
                      onPress={() => setRecPattern(p)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: recPattern === p ? "#FFF" : colors.textSecondary }}>{patternLabels[p]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Note */}
                <TextInput
                  style={{ backgroundColor: colors.bg, borderRadius: 14, padding: 14, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 20 }}
                  placeholder="Note (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={recNote}
                  onChangeText={setRecNote}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.bg, alignItems: "center", borderWidth: 1, borderColor: colors.cardBorder }} onPress={() => setShowRecurringForm(false)}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textSecondary }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center" }} onPress={handleSaveRecurring}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>Add</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* Backup Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>💾 Backup & Restore</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", minHeight: 48, justifyContent: "center" }} onPress={handleManualBackup} disabled={loading !== null}>
              {loading === "backup" ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}>📤 Export</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", borderWidth: 1.5, borderColor: colors.cardBorder, minHeight: 48, justifyContent: "center" }} onPress={handleImport} disabled={loading !== null}>
              {loading === "import" ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>📥 Import</Text>}
            </TouchableOpacity>
          </View>

          {/* Auto backups */}
          {backups.length > 0 && (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 12 }]}>
              {backups.map((b, i) => (
                <View key={b.name}>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 }}>
                    <Text style={{ fontSize: 18 }}>💾</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{formatBackupDate(b.date)}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatSize(b.size)}</Text>
                    </View>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.primaryLight }}
                      onPress={() => Alert.alert("Restore?", `Restore from ${formatBackupDate(b.date)}?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Restore", style: "destructive", onPress: async () => { const r = await restoreAutoBackup(b.uri); Alert.alert(r.success ? "Done ✅" : "Failed", r.message); await loadAll(); }},
                      ])}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>Restore</Text>
                    </TouchableOpacity>
                  </View>
                  {i < backups.length - 1 && <View style={{ height: 1, backgroundColor: colors.cardBorder }} />}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {renderCatPicker()}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
});
