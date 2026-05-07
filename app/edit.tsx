import React, { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { TransactionType, Expense } from "../src/types/expense";
import { getExpenses, updateExpense, deleteExpense } from "../src/storage/expenseStorage";
import { formatDate } from "../src/utils/helpers";
import CategorySelect from "../src/components/CategorySelect";
import { useTheme } from "../src/context/ThemeContext";

export default function EditExpenseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [receiptName, setReceiptName] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [id]);

  const loadTransaction = async () => {
    if (!id) return;
    const all = await getExpenses();
    const found = all.find((e) => e.id === id);
    if (found) {
      setType(found.type || "expense");
      setAmount(found.amount.toString());
      setCategory(found.category);
      setNote(found.note);
      setDate(new Date(found.date));
      setReceiptUri(found.receiptUri);
      setReceiptName(found.receiptName);
      setLoaded(true);
    } else {
      Alert.alert("Error", "Transaction not found.");
      router.back();
    }
  };

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
      await updateExpense({
        id: id!,
        type,
        amount: numAmount,
        category,
        date: date.toISOString(),
        note: note.trim(),
        receiptUri,
        receiptName,
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Updated", "Transaction updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to update. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteExpense(id!);
            router.back();
          },
        },
      ]
    );
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

  if (!loaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            <TouchableOpacity
              onPress={() => router.back()}
              style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <Text style={{ fontSize: 20 }}>←</Text>
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: colors.text }]}>Edit transaction</Text>
            <TouchableOpacity onPress={handleDelete} style={[s.deleteHeaderBtn, { backgroundColor: colors.dangerLight }]}>
              <Text style={[s.deleteHeaderText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
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
              style={[s.cancelBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.back()}
            >
              <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.saveBtn,
                type === "income" && { backgroundColor: colors.primary },
                type === "expense" && { backgroundColor: colors.danger },
                saving && { opacity: 0.6 },
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={s.saveBtnText}>
                {saving ? "Saving..." : "Update"}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  deleteHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  deleteHeaderText: {
    fontSize: 13,
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
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1.5,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  saveBtnText: {
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
