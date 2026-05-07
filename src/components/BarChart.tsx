import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
}

export default function BarChart({
  data,
  height = 140,
  barColor = "#4B7A5B",
}: BarChartProps) {
  const { colors } = useTheme();
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.barsRow, { height }]}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 24);
          return (
            <View key={index} style={styles.barCol}>
              {item.value > 0 && (
                <Text style={[styles.barValue, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.value >= 1000
                    ? `${(item.value / 1000).toFixed(1)}k`
                    : item.value.toFixed(0)}
                </Text>
              )}
              <View
                style={{
                  height: Math.max(barHeight, 3),
                  backgroundColor: item.value > 0 ? barColor : colors.cardBorder,
                  borderRadius: 6,
                  width: "100%",
                  maxWidth: 28,
                  opacity: item.value > 0 ? 1 : 0.4,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labelsRow}>
        {data.map((item, index) => (
          <View key={index} style={styles.barCol}>
            <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
      </View>
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
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 2,
  },
  barValue: {
    fontSize: 9,
    color: "#7A8F84",
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 10,
    color: "#7A8F84",
  },
});
