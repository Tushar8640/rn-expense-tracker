import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { TransactionType } from "../src/types/expense";
import { saveExpense } from "../src/storage/expenseStorage";
import { generateId, formatDate } from "../src/utils/helpers";
import CategorySelect from "../src/components/CategorySelect";
import { useTheme } from "../src/context/ThemeContext";

const TEMPLATES = [
  { label: "Lunch", type: "expense" as TransactionType, category: "food", amount: "150", note: "Lunch" },
  { label: "Ride", type: "expense" as TransactionType, category: "transport", amount: "100", note: "Transport" },
  { label: "Internet", type: "expense" as TransactionType, category: "bills", amount: "1000", note: "Internet bill" },
  { label: "Salary", type: "income" as TransactionType, category: "salary", amount: "", note: "Salary" },
];

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [receiptName, setReceiptName] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
      return;
    }

    setSaving(true);
    try {
      await saveExpense({
        id: generateId(),
        type,
        amount: numAmount,
        category,
        date: date.toISOString(),
        note: note.trim(),
        receiptUri,
        receiptName,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Saved! ✅", `${type === "income" ? "Income" : "Expense"} added successfully.`, [
        {
          text: "OK",
          onPress: () => {
            setAmount("");
            setNote("");
            setCategory("food");
            setDate(new Date());
            setReceiptUri(undefined);
            setReceiptName(undefined);
            setType("expense");
            router.push("/");
          },
        },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setNote("");
    setCategory("food");
    setDate(new Date());
    setReceiptUri(undefined);
    setReceiptName(undefined);
    setType("expense");
  };

  const applyTemplate = (template: (typeof TEMPLATES)[number]) => {
    setType(template.type);
    setCategory(template.category);
    setAmount(template.amount);
    setNote(template.note);
  };

  const pickReceipt = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      setReceiptUri(result.assets[0].uri);
      setReceiptName(result.assets[0].name);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={[s.headerTitle, { color: colors.text }]}>Add transaction</Text>
          </View>

          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Quick templates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.label}
                  onPress={() => applyTemplate(template)}
                  style={[s.templateChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
                  <Text style={[s.templateText, { color: colors.text }]}>{template.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Income / Expense Toggle */}
          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[
                  s.toggleBtn,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  type === "expense" && { backgroundColor: colors.dangerLight, borderColor: colors.danger },
                ]}
                onPress={() => setType("expense")}
              >
                <Text style={{ fontSize: 16 }}>💸</Text>
                <Text
                  style={[
                    s.toggleText,
                    { color: colors.textSecondary },
                    type === "expense" && { color: colors.danger },
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.toggleBtn,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  type === "income" && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
                onPress={() => setType("income")}
              >
                <Text style={{ fontSize: 16 }}>💰</Text>
                <Text
                  style={[
                    s.toggleText,
                    { color: colors.textSecondary },
                    type === "income" && { color: colors.primary },
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount */}
          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Amount</Text>
            <View style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[s.currencySymbol, { color: colors.danger }, type === "income" && { color: colors.primary }]}>৳</Text>
              <TextInput
                style={[s.amountInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          {/* Category */}
          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
            <CategorySelect selected={category} onSelect={setCategory} />
          </View>

          {/* Date */}
          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
            <TouchableOpacity
              style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16 }}>📅</Text>
              <Text style={[s.dateText, { color: colors.text }]}>{formatDate(date.toISOString())}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>▾</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {Platform.OS === "android" && showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="calendar"
              onChange={handleDateChange}
            />
          )}

          {Platform.OS === "ios" && showDatePicker && (
            <Modal transparent animationType="slide">
              <View style={s.modalOverlay}>
                <View style={[s.modalContent, { backgroundColor: colors.card }]}>
                  <View style={[s.modalHeader, { borderBottomColor: colors.cardBorder }]}>
                    <Text style={[s.modalTitle, { color: colors.text }]}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[s.modalDone, { color: colors.primary }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="inline"
                    onChange={handleDateChange}
                    style={{ height: 340 }}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Note */}
          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
            <View style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TextInput
                style={[s.noteInput, { color: colors.text }]}
                placeholder="What was this for?"
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Receipt (optional)</Text>
            <TouchableOpacity
              style={[s.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={pickReceipt}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16 }}>🧾</Text>
              <Text style={[s.dateText, { color: colors.text }]} numberOfLines={1}>
                {receiptName || "Attach receipt or bill"}
              </Text>
              {receiptUri ? (
                <TouchableOpacity
                  onPress={() => {
                    setReceiptUri(undefined);
                    setReceiptName(undefined);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: colors.danger, fontSize: 16, fontWeight: "700" }}>×</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 18 }}>＋</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.draftBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={resetForm}
            >
              <Text style={[s.draftBtnText, { color: colors.textSecondary }]}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.addBtn,
                type === "income" && { backgroundColor: colors.primary },
                type === "expense" && { backgroundColor: colors.danger },
                saving && { opacity: 0.6 },
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={s.addBtnText}>
                {saving ? "Saving..." : type === "income" ? "Add Income" : "Add Expense"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  fieldGroup: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  templateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  templateText: {
    fontSize: 13,
    fontWeight: "700",
  },
  inputCard: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    gap: 10,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: "700",
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    padding: 0,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  noteInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    minHeight: 40,
    textAlignVertical: "top",
  },
  btnRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 12,
  },
  draftBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
  },
  draftBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  addBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
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
    fontSize: 17,
    fontWeight: "700",
  },
  modalDone: {
    fontSize: 16,
    fontWeight: "700",
  },
});
