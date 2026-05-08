import { redactObject, redactText } from "./redact.js";
import type { LogLevel } from "../yuki/types.js";

const ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

export interface LoggerOptions {
  level: LogLevel;
  allowSensitiveDebugLogging: boolean;
}

export class Logger {
  private readonly level: LogLevel;
  private readonly allowSensitiveDebugLogging: boolean;

  public constructor(options: LoggerOptions) {
    this.level = options.level;
    this.allowSensitiveDebugLogging = options.allowSensitiveDebugLogging;
  }

  public error(message: string, data?: unknown): void {
    this.emit("error", message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.emit("warn", message, data);
  }

  public info(message: string, data?: unknown): void {
    this.emit("info", message, data);
  }

  public debug(message: string, data?: unknown): void {
    this.emit("debug", message, data);
  }

  private emit(level: LogLevel, message: string, data?: unknown): void {
    if (ORDER[level] > ORDER[this.level]) {
      return;
    }

    const safeMessage = this.allowSensitiveDebugLogging && level === "debug"
      ? message
      : redactText(message);

    const safeData = this.allowSensitiveDebugLogging && level === "debug"
      ? data
      : redactObject(data);

    const line = `[openclaw-yuki][${level}] ${safeMessage}`;
    if (safeData === undefined) {
      console.log(line);
      return;
    }
    console.log(line, safeData);
  }
}
