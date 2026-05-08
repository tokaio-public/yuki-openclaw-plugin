/**
 * Output formatters for CLI commands
 * Supports: text (default), json, csv, and table formats
 */

export type OutputFormat = "text" | "json" | "csv" | "table";

export interface FormattedOutput {
  format: OutputFormat;
  content: string;
}

export interface TableRow {
  [key: string]: string | number | boolean | undefined;
}

export class CLIFormatter {
  static formatText(message: string, level: "info" | "success" | "warning" | "error" = "info"): string {
    const prefixes: Record<string, string> = {
      info: "ℹ",
      success: "✓",
      warning: "⚠",
      error: "✗"
    };
    return `${prefixes[level]} ${message}`;
  }

  static formatTable(headers: string[], rows: TableRow[]): string {
    if (rows.length === 0) {
      return "No data to display.";
    }

    // Calculate column widths
    const colWidths: Record<string, number> = {};
    headers.forEach((header) => {
      colWidths[header] = Math.max(
        header.length,
        ...rows.map((row) => String(row[header] ?? "").length)
      );
    });

    // Format header
    const headerRow = headers.map((h) => h.padEnd(colWidths[h])).join(" | ");
    const separator = headers.map((h) => "".padEnd(colWidths[h], "─")).join("─┼─");

    // Format rows
    const dataRows = rows.map((row) =>
      headers.map((h) => String(row[h] ?? "").padEnd(colWidths[h])).join(" | ")
    );

    return [headerRow, separator, ...dataRows].join("\n");
  }

  static formatJSON(data: unknown): string {
    return JSON.stringify(data, null, 2);
  }

  static formatCSV(headers: string[], rows: TableRow[]): string {
    const escapeCsvField = (field: unknown): string => {
      const str = String(field ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(escapeCsvField).join(",");
    const dataLines = rows.map((row) => headers.map((h) => escapeCsvField(row[h] ?? "")).join(","));

    return [headerLine, ...dataLines].join("\n");
  }

  static formatStatus(status: "ok" | "warning" | "error", message: string): string {
    const symbols = { ok: "✓ OK", warning: "⚠ WARNING", error: "✗ ERROR" };
    return `[${symbols[status]}] ${message}`;
  }

  static formatKeyValue(data: Record<string, unknown>, indent = 2): string {
    const indentStr = " ".repeat(indent);
    return Object.entries(data)
      .map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          return `${indentStr}${key}:\n${this.formatKeyValue(value as Record<string, unknown>, indent + 2)}`;
        }
        return `${indentStr}${key}: ${value ?? "(empty)"}`;
      })
      .join("\n");
  }

  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  }

  static formatBytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIdx = 0;
    while (size >= 1024 && unitIdx < units.length - 1) {
      size /= 1024;
      unitIdx++;
    }
    return `${size.toFixed(2)} ${units[unitIdx]}`;
  }
}
