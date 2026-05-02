import { File, Directory, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";

const BACKUP_DIR_NAME = "backups";
const LAST_AUTO_BACKUP_KEY = "last_auto_backup_date";
const MAX_AUTO_BACKUPS = 7;

const getBackupDir = (): Directory => {
  return new Directory(Paths.document, BACKUP_DIR_NAME);
};

const ensureBackupDir = () => {
  const dir = getBackupDir();
  if (!dir.exists) {
    dir.create();
  }
};

// Get all AsyncStorage data as JSON
const getAllData = async (): Promise<string> => {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  const data: Record<string, any> = {};
  pairs.forEach(([key, value]) => {
    if (key && value) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  });
  return JSON.stringify(
    {
      appName: "ExpenseTracker",
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2
  );
};

// Restore data from backup JSON
const restoreData = async (
  jsonString: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.appName || parsed.appName !== "ExpenseTracker") {
      return {
        success: false,
        message: "Invalid backup file. Not an Expense Tracker backup.",
      };
    }

    if (!parsed.data || typeof parsed.data !== "object") {
      return { success: false, message: "Backup file is corrupted or empty." };
    }

    // Clear existing data
    const existingKeys = await AsyncStorage.getAllKeys();
    if (existingKeys.length > 0) {
      await AsyncStorage.multiRemove(existingKeys);
    }

    // Restore all key-value pairs
    const pairs: [string, string][] = Object.entries(parsed.data).map(
      ([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]
    );

    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }

    return {
      success: true,
      message: `Restored ${pairs.length} items from backup (${format(new Date(parsed.exportedAt), "dd MMM yyyy, hh:mm a")}).`,
    };
  } catch {
    return { success: false, message: "Failed to parse backup file." };
  }
};

// --- Manual Backup (share as file) ---

export const createManualBackup = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const jsonData = await getAllData();
    const fileName = `expense-tracker-backup-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`;
    const file = new File(Paths.cache, fileName);

    file.write(jsonData);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Save Expense Tracker Backup",
        UTI: "public.json",
      });
      return {
        success: true,
        message: `Backup "${fileName}" created and shared.`,
      };
    } else {
      return {
        success: false,
        message: "Sharing is not available on this device.",
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Backup failed: ${err.message || "Unknown error"}`,
    };
  }
};

// --- Manual Import ---

export const importBackup = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, message: "No file selected." };
    }

    const pickedFile = result.assets[0];
    const file = new File(pickedFile.uri);
    const content = await file.text();

    return await restoreData(content);
  } catch (err: any) {
    return {
      success: false,
      message: `Import failed: ${err.message || "Unknown error"}`,
    };
  }
};

// --- Auto Daily Backup ---

export const runAutoBackupIfNeeded = async (): Promise<void> => {
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const lastBackup = await AsyncStorage.getItem(LAST_AUTO_BACKUP_KEY);

    if (lastBackup === today) {
      return; // Already backed up today
    }

    ensureBackupDir();

    const jsonData = await getAllData();
    const fileName = `auto-backup-${today}.json`;
    const file = new File(getBackupDir(), fileName);

    file.write(jsonData);

    // Save today's date as last backup
    await AsyncStorage.setItem(LAST_AUTO_BACKUP_KEY, today);

    // Clean up old backups (keep last 7)
    await cleanOldAutoBackups();
  } catch {
    // Silently fail — auto backup shouldn't crash the app
  }
};

const cleanOldAutoBackups = async (): Promise<void> => {
  try {
    const dir = getBackupDir();
    if (!dir.exists) return;

    const items = dir.list();
    const autoBackups = items
      .filter(
        (item): item is File =>
          item instanceof File &&
          item.name.startsWith("auto-backup-") &&
          item.name.endsWith(".json")
      )
      .sort((a, b) => b.name.localeCompare(a.name)); // newest first

    // Delete backups beyond MAX_AUTO_BACKUPS
    for (let i = MAX_AUTO_BACKUPS; i < autoBackups.length; i++) {
      autoBackups[i].delete();
    }
  } catch {
    // Silently fail
  }
};

// --- List Auto Backups ---

export interface BackupInfo {
  name: string;
  date: string;
  size: number;
  uri: string;
}

export const listAutoBackups = async (): Promise<BackupInfo[]> => {
  try {
    ensureBackupDir();
    const dir = getBackupDir();
    const items = dir.list();
    const backups: BackupInfo[] = [];

    for (const item of items) {
      if (
        item instanceof File &&
        item.name.startsWith("auto-backup-") &&
        item.name.endsWith(".json")
      ) {
        const dateStr = item.name
          .replace("auto-backup-", "")
          .replace(".json", "");
        backups.push({
          name: item.name,
          date: dateStr,
          size: item.size || 0,
          uri: item.uri,
        });
      }
    }

    return backups.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
};

// --- Restore from Auto Backup ---

export const restoreAutoBackup = async (
  uri: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const file = new File(uri);
    const content = await file.text();
    return await restoreData(content);
  } catch (err: any) {
    return {
      success: false,
      message: `Restore failed: ${err.message || "Unknown error"}`,
    };
  }
};

// --- Delete Auto Backup ---

export const deleteAutoBackup = async (uri: string): Promise<void> => {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Silently fail
  }
};
