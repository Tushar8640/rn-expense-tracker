import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text, Platform, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { runAutoBackupIfNeeded } from "../src/storage/backupService";
import { processRecurringTransactions } from "../src/storage/recurringService";
import { initNotifications } from "../src/storage/notificationService";

const TAB_CONFIG = [
  { name: "index", label: "Home" },
  { name: "expenses", label: "History" },
  { name: "add", label: "Add", isCenter: true },
  { name: "budgets", label: "Budget" },
  { name: "reports", label: "Reports" },
];

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
          const isCenter = config.isCenter === true;

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

          if (isCenter) {
            return (
              <Pressable key={route.key} onPress={onPress} style={s.centerWrapper}>
                <View style={[s.centerBtn, isFocused && { backgroundColor: colors.primaryDark, transform: [{ scale: 1.06 }] }]}>
                  <Text style={{ fontSize: 24, color: "#FFFFFF" }}>+</Text>
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={s.tabItem}>
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
        <Tabs.Screen name="add" />
        <Tabs.Screen name="budgets" />
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="settings" options={{ href: null }} />
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
  centerWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30,
  },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#4B7A5B",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#4B7A5B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 14,
        shadowColor: "#4B7A5B",
      },
    }),
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
