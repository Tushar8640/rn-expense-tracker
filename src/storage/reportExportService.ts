import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { format, parseISO } from "date-fns";
import { CategoryInfo, Expense, getCategoryInfo } from "../types/expense";
import { formatCurrency, generateTextReport } from "../utils/helpers";

const escapeCsv = (value: string | number): string => {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
};

const getSafeTitle = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const shareFile = async (
  fileName: string,
  content: string,
  mimeType: string,
  dialogTitle: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const file = new File(Paths.cache, fileName);
    file.write(content);

    if (!(await Sharing.isAvailableAsync())) {
      return { success: false, message: "Sharing is not available on this device." };
    }

    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
    return { success: true, message: `${fileName} exported.` };
  } catch (err: any) {
    return { success: false, message: `Export failed: ${err.message || "Unknown error"}` };
  }
};

export const exportTransactionsCsv = async (
  expenses: Expense[],
  title: string,
  customCategories: CategoryInfo[] = []
) => {
  const header = ["Date", "Type", "Category", "Amount", "Note", "Receipt"];
  const rows = expenses.map((expense) => {
    const category = getCategoryInfo(expense.category, customCategories);
    return [
      format(parseISO(expense.date), "yyyy-MM-dd"),
      expense.type,
      category.label,
      expense.amount,
      expense.note,
      expense.receiptName || expense.receiptUri || "",
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");

  return shareFile(
    `${getSafeTitle(title)}.csv`,
    csv,
    "text/csv",
    "Export CSV Report"
  );
};

export const exportPrintableReport = async (
  expenses: Expense[],
  title: string,
  customCategories: CategoryInfo[] = []
) => {
  const report = generateTextReport(expenses, title, customCategories)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const rows = expenses
    .map((expense) => {
      const category = getCategoryInfo(expense.category, customCategories);
      return `
        <tr>
          <td>${format(parseISO(expense.date), "dd MMM yyyy")}</td>
          <td>${expense.type}</td>
          <td>${category.emoji} ${category.label}</td>
          <td>${formatCurrency(expense.amount)}</td>
          <td>${expense.note || ""}</td>
        </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1A2B23; padding: 24px; }
    h1 { margin: 0 0 16px; }
    pre { background: #F5F7F6; padding: 16px; border-radius: 12px; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #E8F0EB; }
    th { background: #F5F7F6; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <pre>${report}</pre>
  <table>
    <thead>
      <tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Note</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  return shareFile(
    `${getSafeTitle(title)}.html`,
    html,
    "text/html",
    "Export Printable Report"
  );
};
