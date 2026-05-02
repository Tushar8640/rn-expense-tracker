import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { CategoryInfo, Expense, getCategoryInfo } from "../types/expense";
import { formatCurrency, formatDateShort } from "../utils/helpers";

interface ExpenseItemProps {
  expense: Expense;
  customCategories?: CategoryInfo[];
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ExpenseItem({
  expense,
  customCategories = [],
  onEdit,
  onDelete,
}: ExpenseItemProps) {
  const category = getCategoryInfo(expense.category, customCategories);
  const isIncome = expense.type === "income";
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const dotRef = useRef<View>(null);

  const openMenu = () => {
    dotRef.current?.measureInWindow((x, y, width, height) => {
      const screenW = Dimensions.get("window").width;
      setMenuPos({
        top: y + height + 4,
        right: screenW - x - width,
      });
      setMenuVisible(true);
    });
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isIncome ? "#E8F0EB" : "#FDF2F2",
            borderColor: isIncome ? "#C8DDD0" : "#F5DADA",
          },
        ]}
      >
        {/* Left accent strip */}
        <View
          style={{
            width: 4,
            height: 36,
            borderRadius: 2,
            backgroundColor: isIncome ? "#4B7A5B" : "#E85D5D",
            marginRight: 10,
            opacity: 0.6,
          }}
        />

        {/* Category Emoji */}
        <View
          style={[styles.iconBg, { backgroundColor: category.color + "15" }]}
        >
          <Text style={{ fontSize: 22 }}>{category.emoji}</Text>
        </View>

        {/* Details */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.categoryLabel}>{category.label}</Text>
          {expense.note ? (
            <Text style={styles.note} numberOfLines={1}>
              {expense.note}
            </Text>
          ) : null}
          {expense.receiptUri ? (
            <Text style={styles.receipt} numberOfLines={1}>
              Receipt attached
            </Text>
          ) : null}
        </View>

        {/* Amount & Date */}
        <View style={{ alignItems: "flex-end", marginRight: 6 }}>
          <Text style={[styles.amount, isIncome && { color: "#4B7A5B" }]}>
            {isIncome ? "+" : "-"}
            {formatCurrency(expense.amount)}
          </Text>
          <Text style={styles.date}>{formatDateShort(expense.date)}</Text>
        </View>

        {/* Three dot menu */}
        {(onEdit || onDelete) && (
          <TouchableOpacity
            ref={dotRef as any}
            onPress={openMenu}
            style={styles.dotBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dotText}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Popover Menu */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuCard, { top: menuPos.top, right: menuPos.right }]}>
            {onEdit && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onEdit();
                }}
              >
                <Text style={styles.menuIcon}>✏️</Text>
                <Text style={styles.menuLabel}>Edit</Text>
              </TouchableOpacity>
            )}
            {onEdit && onDelete && <View style={styles.menuDivider} />}
            {onDelete && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  onDelete();
                }}
              >
                <Text style={styles.menuIcon}>🗑️</Text>
                <Text style={[styles.menuLabel, { color: "#E85D5D" }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8F0EB",
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A2B23",
  },
  note: {
    fontSize: 12,
    color: "#7A8F84",
    marginTop: 2,
  },
  receipt: {
    fontSize: 11,
    color: "#4B7A5B",
    marginTop: 2,
    fontWeight: "600",
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2B23",
  },
  date: {
    fontSize: 11,
    color: "#A8C5B5",
    marginTop: 2,
  },
  dotBtn: {
    width: 28,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#A8C5B5",
    lineHeight: 22,
  },
  // Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuCard: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 150,
    borderWidth: 1,
    borderColor: "#E8F0EB",
    shadowColor: "#1A2B23",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  menuIcon: {
    fontSize: 16,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A2B23",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F5F7F6",
    marginHorizontal: 12,
  },
});
