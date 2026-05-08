import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface PurchaseInvoiceSchema {
  schemaPath: string;
  schemaContent?: string;
  rawData?: unknown;
}

export interface PurchaseItem {
  itemId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  rawData?: unknown;
}

export interface InvoiceSubmissionResult {
  success: boolean;
  invoiceId?: string;
  validationErrors?: string[];
  warnings?: string[];
  processedCount?: number;
  rejectedCount?: number;
  rawData?: unknown;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function safeNumber(value: unknown): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export class PurchaseService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async getPurchaseInvoiceSchemaPath(): Promise<PurchaseInvoiceSchema> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Purchase",
      method: "PurchaseInvoiceSchemaPath",
      args: {
        sessionID
      }
    });

    const schemaPath = typeof raw === "string" ? raw : safeString(raw as Record<string, unknown>) ?? "";

    return {
      schemaPath,
      rawData: raw
    };
  }

  public async getPurchaseItems(administrationId: number): Promise<PurchaseItem[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Purchase",
      method: "GetPurchaseItems",
      args: {
        sessionID,
        administrationID: administrationId
      }
    });

    const maybeRows = (raw as { Item?: unknown; Items?: { Item?: unknown } }).Items?.Item ??
      (raw as { Item?: unknown }).Item;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        itemId: safeString(item.ItemID) ?? safeString(item.ID) ?? "",
        description: safeString(item.Description),
        quantity: safeNumber(item.Quantity ?? item.Qty ?? 0),
        unitPrice: safeNumber(item.UnitPrice ?? item.Price ?? 0),
        total: safeNumber(item.Total ?? item.Amount ?? 0),
        rawData: row
      };
    });
  }

  public async processPurchaseInvoices(
    administrationId: number,
    invoiceXml: string,
    dryRun: boolean = true
  ): Promise<InvoiceSubmissionResult> {
    const sessionID = await this.sessionManager.getSessionId();
    
    try {
      const raw = await this.soapClient.call<unknown>({
        service: "Purchase",
        method: "ProcessPurchaseInvoices",
        args: {
          sessionID,
          administrationID: administrationId,
          xmlDocument: invoiceXml
        }
      });

      const result = raw as Record<string, unknown>;
      
      // Parse response structure
      const errors = toArray(result.ValidationErrors ?? result.Errors);
      const warnings = toArray(result.Warnings ?? []);
      
      return {
        success: !dryRun && (errors.length === 0),
        invoiceId: safeString(result.InvoiceID) ?? safeString(result.ID),
        validationErrors: errors.map((e) => safeString(e) ?? JSON.stringify(e)).filter((e) => e),
        warnings: warnings.map((w) => safeString(w) ?? JSON.stringify(w)).filter((w) => w),
        processedCount: safeNumber(result.ProcessedCount ?? result.Count ?? 0),
        rejectedCount: safeNumber(result.RejectedCount ?? result.Rejected ?? 0),
        rawData: raw
      };
    } catch (error) {
      return {
        success: false,
        validationErrors: [error instanceof Error ? error.message : "Unknown error"],
        warnings: [],
        rawData: undefined
      };
    }
  }
}
