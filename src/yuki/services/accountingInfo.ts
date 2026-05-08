import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface GLAccount {
  accountCode: string;
  accountName?: string;
  accountType?: string;
  rawData?: unknown;
}

export interface TransactionDetail {
  transactionId: string;
  date?: string;
  description?: string;
  amount: number;
  accountCode?: string;
  status?: string;
  rawData?: unknown;
}

export interface TransactionSearchResult {
  transactionId: string;
  date?: string;
  amount: number;
  description?: string;
  accountCode?: string;
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

export class AccountingInfoService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async getGLAccountScheme(
    administrationId: number
  ): Promise<GLAccount[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "AccountingInfo",
      method: "GetGLAccountScheme",
      args: {
        sessionID,
        administrationID: administrationId
      }
    });

    const maybeRows = (raw as { Account?: unknown; Accounts?: { Account?: unknown } }).Accounts?.Account ??
      (raw as { Account?: unknown }).Account;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        accountCode: safeString(item.Code) ?? safeString(item.AccountCode) ?? "",
        accountName: safeString(item.Name) ?? safeString(item.AccountName),
        accountType: safeString(item.Type) ?? safeString(item.AccountType),
        rawData: row
      };
    });
  }

  public async getTransactions(
    administrationId: number,
    fromDate?: string,
    toDate?: string,
    accountCode?: string
  ): Promise<TransactionSearchResult[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const args: Record<string, unknown> = {
      sessionID,
      administrationID: administrationId
    };
    if (fromDate) {
      args.dateFrom = fromDate;
    }
    if (toDate) {
      args.dateTo = toDate;
    }
    if (accountCode) {
      args.accountCode = accountCode;
    }

    const raw = await this.soapClient.call<unknown>({
      service: "AccountingInfo",
      method: "GetTransactions",
      args
    });

    const maybeRows = (raw as { Transaction?: unknown; Transactions?: { Transaction?: unknown } }).Transactions?.Transaction ??
      (raw as { Transaction?: unknown }).Transaction;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        transactionId: safeString(item.TransactionID) ?? safeString(item.ID) ?? "",
        date: safeString(item.Date) ?? safeString(item.TransactionDate),
        amount: safeNumber(item.Amount ?? item.Value ?? 0),
        description: safeString(item.Description) ?? safeString(item.Memo),
        accountCode: safeString(item.AccountCode) ?? safeString(item.Code),
        rawData: row
      };
    });
  }

  public async getTransactionDetails(
    transactionId: string
  ): Promise<TransactionDetail> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "AccountingInfo",
      method: "GetTransactionDetails",
      args: {
        sessionID,
        transactionID: transactionId
      }
    });

    const item = raw as Record<string, unknown>;
    return {
      transactionId: safeString(item.TransactionID) ?? safeString(item.ID) ?? transactionId,
      date: safeString(item.Date) ?? safeString(item.TransactionDate),
      description: safeString(item.Description) ?? safeString(item.Memo),
      amount: safeNumber(item.Amount ?? item.Value ?? 0),
      accountCode: safeString(item.AccountCode) ?? safeString(item.Code),
      status: safeString(item.Status) ?? safeString(item.State),
      rawData: raw
    };
  }
}
