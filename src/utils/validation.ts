import { YukiConfigError } from "../yuki/errors.js";

export function asPositiveInt(name: string, value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new YukiConfigError(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return fallback;
}

export function ensureRequiredString(name: string, value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new YukiConfigError(`${name} is required.`);
  }
  return value.trim();
}
