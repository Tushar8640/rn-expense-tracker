import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({
  title,
  subtitle,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A2B23",
  },
  subtitle: {
    fontSize: 13,
    color: "#7A8F84",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
