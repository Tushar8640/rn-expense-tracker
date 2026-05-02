import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { getCategoryInfo } from "../types/expense";
import { formatCurrency } from "../utils/helpers";

interface CategoryBreakdownProps {
  data: { category: string; total: number; count: number }[];
  grandTotal: number;
}

export default function CategoryBreakdown({
  data,
  grandTotal,
}: CategoryBreakdownProps) {
  return (
    <View style={styles.card}>
      {data.map((item, index) => {
        const cat = getCategoryInfo(item.category);
        const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;

        return (
          <View key={item.category}>
            <View style={styles.row}>
              <View
                style={[
                  styles.iconBg,
                  { backgroundColor: cat.color + "15" },
                ]}
              >
                <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
              </View>

              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                  <Text style={styles.catAmount}>
                    {formatCurrency(item.total)}
                  </Text>
                </View>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: cat.color,
                      },
                    ]}
                  />
                </View>
              </View>

              <Text style={styles.pct}>{pct.toFixed(0)}%</Text>
            </View>
            {index < data.length - 1 && <View style={styles.divider} />}
          </View>
        );
      })}

      {data.length === 0 && (
        <Text style={styles.empty}>No data available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8F0EB",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2B23",
  },
  catAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A2B23",
  },
  progressBg: {
    height: 6,
    backgroundColor: "#E8F0EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  pct: {
    fontSize: 12,
    color: "#7A8F84",
    width: 36,
    textAlign: "right",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F5F7F6",
  },
  empty: {
    color: "#7A8F84",
    textAlign: "center",
    paddingVertical: 16,
  },
});
