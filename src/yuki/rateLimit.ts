import { YukiRateLimitError } from "./errors.js";
import { nowEpochMs, ONE_DAY_MS } from "../utils/dates.js";

export class RateLimitGuard {
  private readonly maxCallsPerMinute: number;
  private readonly maxCallsPerDay: number;
  private minuteWindowStart = nowEpochMs();
  private dayWindowStart = nowEpochMs();
  private minuteCount = 0;
  private dayCount = 0;

  public constructor(maxCallsPerMinute: number, maxCallsPerDay: number) {
    this.maxCallsPerMinute = maxCallsPerMinute;
    this.maxCallsPerDay = maxCallsPerDay;
  }

  public consume(): void {
    const now = nowEpochMs();

    if (now - this.minuteWindowStart >= 60_000) {
      this.minuteWindowStart = now;
      this.minuteCount = 0;
    }

    if (now - this.dayWindowStart >= ONE_DAY_MS) {
      this.dayWindowStart = now;
      this.dayCount = 0;
    }

    if (this.minuteCount >= this.maxCallsPerMinute) {
      throw new YukiRateLimitError("Local minute rate-limit exceeded.");
    }

    if (this.dayCount >= this.maxCallsPerDay) {
      throw new YukiRateLimitError("Local day rate-limit exceeded.");
    }

    this.minuteCount += 1;
    this.dayCount += 1;
  }
}
