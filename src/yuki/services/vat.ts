import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface VATReturn {
  vatReturnId: string;
  period?: string;
  status?: string;
  statusDate?: string;
  dueDate?: string;
  rawData?: unknown;
}

export interface VATCode {
  vatCodeId: string;
  code?: string;
  description?: string;
  percentage?: number;
  type?: string;
  rawData?: unknown;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function safeNumber(value: unknown): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export class VatService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async getVATReturnList(
    administrationId: number,
    fromPeriod?: string,
    toPeriod?: string
  ): Promise<VATReturn[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const args: Record<string, unknown> = {
      sessionID,
      administrationID: administrationId
    };

    if (fromPeriod) {
      args.fromPeriod = fromPeriod;
    }
    if (toPeriod) {
      args.toPeriod = toPeriod;
    }

    const raw = await this.soapClient.call<unknown>({
      service: "Vat",
      method: "VATReturnList",
      args
    });

    const maybeRows = (raw as { VATReturn?: unknown; VATReturns?: { VATReturn?: unknown } }).VATReturns?.VATReturn ??
      (raw as { VATReturn?: unknown }).VATReturn;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        vatReturnId: safeString(item.VATReturnID) ?? safeString(item.ID) ?? "",
        period: safeString(item.Period),
        status: safeString(item.Status) ?? safeString(item.State),
        statusDate: safeString(item.StatusDate) ?? safeString(item.ModifiedDate),
        dueDate: safeString(item.DueDate),
        rawData: row
      };
    });
  }

  public async getActiveVATCodes(administrationId: number): Promise<VATCode[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Vat",
      method: "ActiveVATCodesList",
      args: {
        sessionID,
        administrationID: administrationId
      }
    });

    const maybeRows = (raw as { VATCode?: unknown; VATCodes?: { VATCode?: unknown } }).VATCodes?.VATCode ??
      (raw as { VATCode?: unknown }).VATCode;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        vatCodeId: safeString(item.VATCodeID) ?? safeString(item.ID) ?? "",
        code: safeString(item.Code),
        description: safeString(item.Description),
        percentage: safeNumber(item.Percentage ?? item.Rate ?? 0),
        type: safeString(item.Type) ?? safeString(item.VATType),
        rawData: row
      };
    });
  }
}

