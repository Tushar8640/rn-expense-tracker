import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const NOTIF_ENABLED_KEY = "notifications_enabled";

// Lazy import to avoid crash in Expo Go
let Notifications: typeof import("expo-notifications") | null = null;

const getNotifications = async () => {
  if (!Notifications) {
    try {
      Notifications = require("expo-notifications");
    } catch {
      return null;
    }
  }
  return Notifications;
};

const MORNING_MESSAGES = [
  "🌅 Good morning! Don't forget to log yesterday's expenses.",
  "☀️ Rise and shine! Track your spending to stay on budget.",
  "🌤️ New day, new budget! Log any expenses you missed.",
  "📝 Morning reminder: Keep your expense records up to date!",
];

const NIGHT_MESSAGES = [
  "🌙 End of day! Did you add all of today's expenses?",
  "🌃 Before bed, log today's spending. Stay on track!",
  "✨ Quick check: Any expenses from today to record?",
  "🌛 Goodnight! Make sure today's expenses are logged.",
];

const getRandomMessage = (messages: string[]) =>
  messages[Math.floor(Math.random() * messages.length)];

// Request permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const N = await getNotifications();
    if (!N) return false;

    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync("reminders", {
        name: "Expense Reminders",
        importance: N.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    const { status: existingStatus } = await N.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch {
    return false;
  }
};

// Schedule morning (8 AM) and night (9 PM) daily notifications
export const scheduleDailyReminders = async (): Promise<void> => {
  try {
    const N = await getNotifications();
    if (!N) return;

    // Set handler
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Cancel all existing
    await N.cancelAllScheduledNotificationsAsync();

    // Morning reminder at 8:00 AM
    await N.scheduleNotificationAsync({
      content: {
        title: "Expense Tracker 💰",
        body: getRandomMessage(MORNING_MESSAGES),
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "reminders" }),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });

    // Night reminder at 9:00 PM
    await N.scheduleNotificationAsync({
      content: {
        title: "Expense Tracker 📊",
        body: getRandomMessage(NIGHT_MESSAGES),
        sound: "default",
        ...(Platform.OS === "android" && { channelId: "reminders" }),
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });

    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, "true");
  } catch {
    // Silently fail in Expo Go
  }
};

// Cancel all reminders
export const cancelDailyReminders = async (): Promise<void> => {
  try {
    const N = await getNotifications();
    if (N) {
      await N.cancelAllScheduledNotificationsAsync();
    }
    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, "false");
  } catch {
    await AsyncStorage.setItem(NOTIF_ENABLED_KEY, "false");
  }
};

// Check if notifications are enabled
export const isNotificationsEnabled = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(NOTIF_ENABLED_KEY);
  return val === "true";
};

// Initialize — call on app start
export const initNotifications = async (): Promise<void> => {
  try {
    const enabled = await isNotificationsEnabled();
    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        await scheduleDailyReminders();
      }
    }
  } catch {
    // Silently fail
  }
};
