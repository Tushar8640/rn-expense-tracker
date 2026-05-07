import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import {
  DEFAULT_CATEGORIES,
  CategoryInfo,
  getCategoryInfo,
} from "../types/expense";
import {
  getCustomCategories,
  saveCustomCategory,
  deleteCustomCategory,
  updateCustomCategory,
} from "../storage/expenseStorage";
import { useTheme } from "../context/ThemeContext";
import KeyboardAwareBottomModal from "./KeyboardAwareBottomModal";

const EMOJI_OPTIONS = [
  "🍔", "🚗", "🛍️", "📄", "🎬", "💊", "📚", "📦",
  "💰", "💻", "🎁", "📈", "🏠", "✈️", "🎮", "👕",
  "🍕", "☕", "🎵", "🐾", "💇", "🔧", "📱", "🎂",
];

const COLOR_OPTIONS = [
  "#4B7A5B", "#5B8A6B", "#E8A87C", "#D4A574", "#E85D5D",
  "#6BA3BE", "#8B7EC8", "#7A8F84", "#C0392B", "#2980B9",
  "#F39C12", "#1ABC9C", "#9B59B6", "#34495E",
];

type FormMode = "none" | "add" | "edit";

interface CategorySelectProps {
  selected: string;
  onSelect: (key: string) => void;
}

export default function CategorySelect({
  selected,
  onSelect,
}: CategorySelectProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [customCats, setCustomCats] = useState<CategoryInfo[]>([]);

  // Form state
  const [formMode, setFormMode] = useState<FormMode>("none");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formEmoji, setFormEmoji] = useState("📦");
  const [formColor, setFormColor] = useState("#4B7A5B");

  useEffect(() => {
    loadCustom();
  }, []);

  const loadCustom = async () => {
    const cats = await getCustomCategories();
    setCustomCats(cats);
  };

  const allCategories = [...DEFAULT_CATEGORIES, ...customCats];
  const selectedCat = getCategoryInfo(selected, customCats);

  const resetForm = () => {
    setFormMode("none");
    setEditingKey(null);
    setFormLabel("");
    setFormEmoji("📦");
    setFormColor("#4B7A5B");
  };

  const handleSelect = (key: string) => {
    onSelect(key);
    setVisible(false);
    resetForm();
  };

  // --- Add ---
  const openAddForm = () => {
    resetForm();
    setFormMode("add");
  };

  const handleAdd = async () => {
    const label = formLabel.trim();
    if (!label) {
      Alert.alert("Error", "Please enter a category name.");
      return;
    }
    const key = label.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    await saveCustomCategory({
      key,
      label,
      emoji: formEmoji,
      color: formColor,
      isCustom: true,
    });
    await loadCustom();
    resetForm();
    onSelect(key);
    setVisible(false);
  };

  // --- Edit ---
  const openEditForm = (cat: CategoryInfo) => {
    setFormMode("edit");
    setEditingKey(cat.key);
    setFormLabel(cat.label);
    setFormEmoji(cat.emoji);
    setFormColor(cat.color);
  };

  const handleSaveEdit = async () => {
    const label = formLabel.trim();
    if (!label) {
      Alert.alert("Error", "Please enter a category name.");
      return;
    }
    if (!editingKey) return;

    await updateCustomCategory({
      key: editingKey,
      label,
      emoji: formEmoji,
      color: formColor,
      isCustom: true,
    });
    await loadCustom();
    resetForm();
  };

  // --- Delete ---
  const handleDelete = (cat: CategoryInfo) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${cat.label}"? Existing transactions using this category won't be affected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCustomCategory(cat.key);
            await loadCustom();
            if (selected === cat.key) {
              onSelect("other");
            }
            resetForm();
          },
        },
      ]
    );
  };

  // --- Render ---
  const renderItem = ({ item }: { item: CategoryInfo }) => {
    const isActive = selected === item.key;
    const isEditing = formMode === "edit" && editingKey === item.key;

    return (
      <TouchableOpacity
        style={[
          s.optionRow,
          { borderBottomColor: colors.cardBorder },
          isActive && { backgroundColor: `${colors.primaryLight}70` },
          isEditing && { backgroundColor: colors.primaryLight },
        ]}
        onPress={() => handleSelect(item.key)}
        activeOpacity={0.7}
      >
        <View style={[s.optionIcon, { backgroundColor: item.color + "15" }]}>
          <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
        </View>
        <Text
          style={[
            s.optionLabel,
            { color: colors.text },
            isActive && { color: colors.primary, fontWeight: "700" },
          ]}
        >
          {item.label}
        </Text>

        {/* Action buttons for custom categories */}
        {item.isCustom && (
          <View style={s.actionBtns}>
            <TouchableOpacity
              onPress={() => openEditForm(item)}
              style={[s.editBtn, { backgroundColor: colors.primaryLight }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[s.actionText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={[s.delBtn, { backgroundColor: colors.dangerLight }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[s.actionText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Checkmark for selected */}
      </TouchableOpacity>
    );
  };

  const renderForm = () => {
    if (formMode === "none") return null;

    const isEdit = formMode === "edit";
    const title = isEdit ? "Edit Category" : "New Category";
    const btnText = isEdit ? "Save" : "Add";
    const onSubmit = isEdit ? handleSaveEdit : handleAdd;

    return (
      <View style={[s.formContainer, { borderTopColor: colors.cardBorder }]}>
        <View style={s.formHeader}>
          <Text style={[s.formTitle, { color: colors.text }]}>{title}</Text>
          {isEdit && (
            <TouchableOpacity
              onPress={() => {
                const cat = customCats.find((c) => c.key === editingKey);
                if (cat) handleDelete(cat);
              }}
              style={[s.formDeleteBtn, { backgroundColor: colors.dangerLight }]}
            >
              <Text style={[s.formDeleteText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Name */}
        <TextInput
          style={[s.formInput, { backgroundColor: colors.bg, borderColor: colors.cardBorder, color: colors.text }]}
          placeholder="Category name"
          placeholderTextColor={colors.textMuted}
          value={formLabel}
          onChangeText={setFormLabel}
          autoFocus={formMode === "add"}
        />

        {/* Emoji picker */}
        <Text style={[s.formFieldLabel, { color: colors.textSecondary }]}>Emoji</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
          style={{ marginBottom: 12 }}
        >
          {EMOJI_OPTIONS.map((e) => (
            <TouchableOpacity
              key={e}
              onPress={() => setFormEmoji(e)}
              style={[
                s.emojiBtn,
                { backgroundColor: colors.bg },
                formEmoji === e && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
            >
              <Text style={{ fontSize: 18 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Color picker */}
        <Text style={[s.formFieldLabel, { color: colors.textSecondary }]}>Color</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          style={{ marginBottom: 16 }}
        >
          {COLOR_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setFormColor(c)}
              style={[
                s.colorBtn,
                { backgroundColor: c },
                formColor === c && { borderWidth: 3, borderColor: colors.text },
              ]}
            />
          ))}
        </ScrollView>

        {/* Preview */}
        <View style={[s.previewRow, { backgroundColor: colors.bg }]}>
          <View style={[s.previewIcon, { backgroundColor: formColor + "15" }]}>
            <Text style={{ fontSize: 20 }}>{formEmoji}</Text>
          </View>
          <Text style={[s.previewLabel, { color: colors.text }]}>
            {formLabel.trim() || "Preview"}
          </Text>
        </View>

        {/* Actions */}
        <View style={s.formActions}>
          <TouchableOpacity style={[s.cancelBtn, { backgroundColor: colors.bg }]} onPress={resetForm}>
            <Text style={[s.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }]} onPress={onSubmit}>
            <Text style={s.saveBtnText}>{btnText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        style={[s.trigger, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => {
          loadCustom();
          resetForm();
          setVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View
          style={[s.triggerIcon, { backgroundColor: selectedCat.color + "15" }]}
        >
          <Text style={{ fontSize: 18 }}>{selectedCat.emoji}</Text>
        </View>
        <Text style={[s.triggerLabel, { color: colors.text }]}>{selectedCat.label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 18 }}>▾</Text>
      </TouchableOpacity>

      {/* Modal */}
      <KeyboardAwareBottomModal
        visible={visible}
        onClose={() => { setVisible(false); resetForm(); }}
        sheetStyle={[s.sheet, { backgroundColor: colors.card }]}
      >
            {/* Header */}
            <View style={[s.sheetHeader, { borderBottomColor: colors.cardBorder }]}>
              <Text style={[s.sheetTitle, { color: colors.text }]}>Select Category</Text>
              <TouchableOpacity onPress={() => { setVisible(false); resetForm(); }}>
                <Text style={[s.sheetClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
              data={allCategories}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              style={{ maxHeight: formMode !== "none" ? 200 : 350 }}
              showsVerticalScrollIndicator={false}
              extraData={[selected, formMode, editingKey]}
            />

            {/* Add button (only when form is not open) */}
            {formMode === "none" && (
              <TouchableOpacity style={[s.addNewBtn, { borderTopColor: colors.cardBorder }]} onPress={openAddForm}>
                <Text style={[s.addNewText, { color: colors.primary }]}>+ Add New Category</Text>
              </TouchableOpacity>
            )}

            {/* Form (add or edit) */}
            {renderForm()}
      </KeyboardAwareBottomModal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8F0EB",
    gap: 10,
  },
  triggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A2B23",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F0EB",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2B23",
  },
  sheetClose: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B7A5B",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F7F6",
  },
  optionRowActive: {
    backgroundColor: "#E8F0EB40",
  },
  optionRowEditing: {
    backgroundColor: "#FFF8E1",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1A2B23",
  },
  actionBtns: {
    flexDirection: "row",
    gap: 6,
  },
  editBtn: {
    minWidth: 44,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#E8F0EB",
    alignItems: "center",
    justifyContent: "center",
  },
  delBtn: {
    minWidth: 56,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FDEAEA",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 11,
    fontWeight: "800",
  },
  addNewBtn: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8F0EB",
  },
  addNewText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B7A5B",
    textAlign: "center",
  },
  // --- Form ---
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8F0EB",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B23",
  },
  formDeleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FDEAEA",
  },
  formDeleteText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E85D5D",
  },
  formInput: {
    backgroundColor: "#F5F7F6",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A2B23",
    borderWidth: 1,
    borderColor: "#E8F0EB",
    marginBottom: 12,
  },
  formFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7A8F84",
    marginBottom: 8,
  },
  emojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7F6",
  },
  emojiBtnActive: {
    backgroundColor: "#E8F0EB",
    borderWidth: 2,
    borderColor: "#4B7A5B",
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  colorBtnActive: {
    borderWidth: 3,
    borderColor: "#1A2B23",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F7F6",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A2B23",
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F5F7F6",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7A8F84",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#4B7A5B",
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
