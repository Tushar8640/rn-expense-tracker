import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text, Platform, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { runAutoBackupIfNeeded } from "../src/storage/backupService";
import { processRecurringTransactions } from "../src/storage/recurringService";
import { initNotifications } from "../src/storage/notificationService";

const TAB_CONFIG = [
  { name: "index", label: "Home", icon: "home" },
  { name: "expenses", label: "History", icon: "history" },
  { name: "budgets", label: "Budget", icon: "target" },
  { name: "reports", label: "Reports", icon: "chart" },
  { name: "settings", label: "Settings", icon: "settings" },
];

function TabIcon({ name, color }: { name: string; color: string }) {
  const strokeProps = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      {name === "home" && (
        <>
          <Path d="M4 10.5 12 4l8 6.5" {...strokeProps} />
          <Path d="M6.5 10v9h11v-9" {...strokeProps} />
          <Path d="M10 19v-5h4v5" {...strokeProps} />
        </>
      )}
      {name === "history" && (
        <>
          <Path d="M4 12a8 8 0 1 0 2.3-5.7" {...strokeProps} />
          <Path d="M4 5.5v4h4" {...strokeProps} />
          <Path d="M12 8v5l3 2" {...strokeProps} />
        </>
      )}
      {name === "target" && (
        <>
          <Circle cx={12} cy={12} r={8} {...strokeProps} />
          <Circle cx={12} cy={12} r={4} {...strokeProps} />
          <Circle cx={12} cy={12} r={1} fill={color} />
        </>
      )}
      {name === "chart" && (
        <>
          <Line x1={5} y1={19} x2={19} y2={19} {...strokeProps} />
          <Rect x={6} y={11} width={3} height={6} rx={1} {...strokeProps} />
          <Rect x={11} y={7} width={3} height={10} rx={1} {...strokeProps} />
          <Rect x={16} y={4} width={3} height={13} rx={1} {...strokeProps} />
        </>
      )}
      {name === "settings" && (
        <>
          <Circle cx={12} cy={12} r={3} {...strokeProps} />
          <Path d="M12 3v3" {...strokeProps} />
          <Path d="M12 18v3" {...strokeProps} />
          <Path d="M3 12h3" {...strokeProps} />
          <Path d="M18 12h3" {...strokeProps} />
          <Path d="m5.6 5.6 2.1 2.1" {...strokeProps} />
          <Path d="m16.3 16.3 2.1 2.1" {...strokeProps} />
          <Path d="m18.4 5.6-2.1 2.1" {...strokeProps} />
          <Path d="m7.7 16.3-2.1 2.1" {...strokeProps} />
        </>
      )}
    </Svg>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <View style={[s.tabBarOuter, { paddingBottom: bottomPadding }]}>
      <View
        style={[
          s.tabBarInner,
          {
            backgroundColor: colors.tabBarBg,
            borderColor: colors.tabBarBorder,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const config = TAB_CONFIG.find((t) => t.name === route.name);
          if (!config) return null;

          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={s.tabItem}>
              <TabIcon
                name={config.icon}
                color={isFocused ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  s.label,
                  {
                    color: isFocused ? colors.primary : colors.textMuted,
                    fontWeight: isFocused ? "700" : "500",
                  },
                ]}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AppContent() {
  const { colors } = useTheme();

  useEffect(() => {
    runAutoBackupIfNeeded();
    processRecurringTransactions();
    initNotifications();
  }, []);

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="expenses" />
        <Tabs.Screen name="budgets" />
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="settings" />
        <Tabs.Screen name="add" options={{ href: null }} />
        <Tabs.Screen name="edit" options={{ href: null }} />
      </Tabs>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const s = StyleSheet.create({
  tabBarOuter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  tabBarInner: {
    flexDirection: "row",
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
        shadowColor: "#000",
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
