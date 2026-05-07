import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface SummaryCardProps {
  title: string;
  amount: string;
  subtitle?: string;
  color?: string;
  indicator?: string;
}

export default function SummaryCard({
  title,
  amount,
  subtitle,
  color = "#4B7A5B",
  indicator,
}: SummaryCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {indicator && (
          <View
            style={{
              width: 4,
              height: 16,
              borderRadius: 2,
              backgroundColor: color,
            }}
          />
        )}
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <Text style={[styles.amount, { color }]}>{amount}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E8F0EB",
  },
  title: {
    fontSize: 12,
    color: "#7A8F84",
    fontWeight: "500",
  },
  amount: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 11,
    color: "#A8C5B5",
    marginTop: 4,
  },
});
