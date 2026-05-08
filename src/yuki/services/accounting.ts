import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface GLAccountBalance {
  accountCode: string;
  accountName?: string;
  debitBalance: number;
  creditBalance: number;
  rawData?: unknown;
}

export interface GLTransaction {
  transactionId: string;
  accountCode: string;
  amount: number;
  date?: string;
  description?: string;
  rawData?: unknown;
}

export interface OutstandingItem {
  itemId: string;
  accountCode?: string;
  amount: number;
  date?: string;
  daysOverdue?: number;
  rawData?: unknown;
}

export interface RevenueData {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
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

export class AccountingService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async getGLAccountBalance(
    administrationId: number,
    date?: string
  ): Promise<GLAccountBalance[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const args: Record<string, unknown> = {
      sessionID,
      administrationID: administrationId
    };
    if (date) {
      args.date = date;
    }

    const raw = await this.soapClient.call<unknown>({
      service: "Accounting",
      method: "GLAccountBalance",
      args
    });

    const maybeRows = (raw as { GLAccount?: unknown; GLAccounts?: { GLAccount?: unknown } }).GLAccounts?.GLAccount ??
      (raw as { GLAccount?: unknown }).GLAccount;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        accountCode: safeString(item.AccountCode) ?? safeString(item.Code) ?? "",
        accountName: safeString(item.AccountName) ?? safeString(item.Name),
        debitBalance: safeNumber(item.DebitBalance ?? item.Debit ?? 0),
        creditBalance: safeNumber(item.CreditBalance ?? item.Credit ?? 0),
        rawData: row
      };
    });
  }

  public async getGLAccountTransactions(
    administrationId: number,
    accountCode: string,
    fromDate?: string,
    toDate?: string
  ): Promise<GLTransaction[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const args: Record<string, unknown> = {
      sessionID,
      administrationID: administrationId,
      accountCode
    };
    if (fromDate) {
      args.dateFrom = fromDate;
    }
    if (toDate) {
      args.dateTo = toDate;
    }

    const raw = await this.soapClient.call<unknown>({
      service: "Accounting",
      method: "GLAccountTransactions",
      args
    });

    const maybeRows = (raw as { Transaction?: unknown; Transactions?: { Transaction?: unknown } }).Transactions?.Transaction ??
      (raw as { Transaction?: unknown }).Transaction;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        transactionId: safeString(item.TransactionID) ?? safeString(item.ID) ?? "",
        accountCode: safeString(item.AccountCode) ?? safeString(item.Code) ?? "",
        amount: safeNumber(item.Amount ?? item.Value ?? 0),
        date: safeString(item.Date ?? item.TransactionDate),
        description: safeString(item.Description ?? item.Memo),
        rawData: row
      };
    });
  }

  public async getOutstandingDebtorItems(
    administrationId: number
  ): Promise<OutstandingItem[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Accounting",
      method: "OutstandingDebtorItems",
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
        accountCode: safeString(item.AccountCode),
        amount: safeNumber(item.Amount ?? item.Outstanding ?? 0),
        date: safeString(item.Date ?? item.DueDate),
        daysOverdue: safeNumber(item.DaysOverdue ?? 0),
        rawData: row
      };
    });
  }

  public async getOutstandingCreditorItems(
    administrationId: number
  ): Promise<OutstandingItem[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Accounting",
      method: "OutstandingCreditorItems",
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
        accountCode: safeString(item.AccountCode),
        amount: safeNumber(item.Amount ?? item.Outstanding ?? 0),
        date: safeString(item.Date ?? item.DueDate),
        daysOverdue: safeNumber(item.DaysOverdue ?? 0),
        rawData: row
      };
    });
  }

  public async getNetRevenue(
    administrationId: number,
    fromDate: string,
    toDate: string
  ): Promise<RevenueData> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Accounting",
      method: "NetRevenue",
      args: {
        sessionID,
        administrationID: administrationId,
        dateFrom: fromDate,
        dateTo: toDate
      }
    });

    const item = raw as Record<string, unknown>;
    return {
      period: `${fromDate} to ${toDate}`,
      totalRevenue: safeNumber(item.TotalRevenue ?? item.Revenue ?? 0),
      totalExpenses: safeNumber(item.TotalExpenses ?? item.Expenses ?? 0),
      netIncome: safeNumber(item.NetIncome ?? item.Net ?? 0),
      rawData: raw
    };
  }
}
