import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { YukiSoapClient } from "../../src/yuki/soap.js";
import type { YukiSessionManager } from "../../src/yuki/auth.js";
import { AccountingService } from "../../src/yuki/services/accounting.js";
import { AccountingInfoService } from "../../src/yuki/services/accountingInfo.js";
import { YukiClient } from "../../src/yuki/client.js";

describe("Accounting Flow Tests", () => {
  let mockSoapClient: Partial<YukiSoapClient>;
  let mockSessionManager: Partial<YukiSessionManager>;

  beforeEach(() => {
    mockSessionManager = {
      getSessionId: vi.fn().mockResolvedValue("SESSION-ABC123")
    };

    mockSoapClient = {
      call: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AccountingService", () => {
    it("should fetch GL account balance with proper method call", async () => {
      const glAccountBalanceXml = {
        GLAccounts: {
          GLAccount: [
            { AccountCode: "1000", AccountName: "Assets", DebitBalance: 5000, CreditBalance: 0 },
            { AccountCode: "2000", AccountName: "Liabilities", DebitBalance: 0, CreditBalance: 3000 }
          ]
        }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(glAccountBalanceXml);

      const service = new AccountingService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getGLAccountBalance(42);

      expect(mockSessionManager.getSessionId).toHaveBeenCalledTimes(1);
      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Accounting",
        method: "GLAccountBalance",
        args: { sessionID: "SESSION-ABC123", administrationID: 42 }
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        accountCode: "1000",
        accountName: "Assets",
        debitBalance: 5000,
        creditBalance: 0,
        rawData: glAccountBalanceXml.GLAccounts.GLAccount[0]
      });
      expect(result[1]).toEqual({
        accountCode: "2000",
        accountName: "Liabilities",
        debitBalance: 0,
        creditBalance: 3000,
        rawData: glAccountBalanceXml.GLAccounts.GLAccount[1]
      });
    });

    it("should handle scalar GL account response", async () => {
      const glAccountBalanceXml = {
        GLAccount: { AccountCode: "3000", AccountName: "Equity", DebitBalance: 2000, CreditBalance: 0 }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(glAccountBalanceXml);

      const service = new AccountingService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getGLAccountBalance(42);

      expect(result).toHaveLength(1);
      expect(result[0].accountCode).toBe("3000");
    });

    it("should fetch GL account transactions with date range", async () => {
      const transactionsXml = {
        Transactions: {
          Transaction: [
            { TransactionID: "TXN001", AccountCode: "1000", Amount: 1000, Date: "2024-05-01", Description: "Deposit" },
            { TransactionID: "TXN002", AccountCode: "1000", Amount: 500, Date: "2024-05-02", Description: "Withdrawal" }
          ]
        }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(transactionsXml);

      const service = new AccountingService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getGLAccountTransactions(42, "1000", "2024-05-01", "2024-05-31");

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Accounting",
        method: "GLAccountTransactions",
        args: {
          sessionID: "SESSION-ABC123",
          administrationID: 42,
          accountCode: "1000",
          dateFrom: "2024-05-01",
          dateTo: "2024-05-31"
        }
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        transactionId: "TXN001",
        accountCode: "1000",
        amount: 1000,
        date: "2024-05-01",
        description: "Deposit",
        rawData: transactionsXml.Transactions.Transaction[0]
      });
    });

    it("should fetch outstanding debtor items", async () => {
      const debtorsXml = {
        Items: {
          Item: [
            { ItemID: "INV001", AccountCode: "1200", Amount: 5000, Date: "2024-04-01", DaysOverdue: 5 },
            { ItemID: "INV002", AccountCode: "1200", Amount: 3000, Date: "2024-04-15", DaysOverdue: 0 }
          ]
        }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(debtorsXml);

      const service = new AccountingService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getOutstandingDebtorItems(42);

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Accounting",
        method: "OutstandingDebtorItems",
        args: { sessionID: "SESSION-ABC123", administrationID: 42 }
      });

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(5000);
      expect(result[0].daysOverdue).toBe(5);
      expect(result[1].daysOverdue).toBe(0);
    });

    it("should fetch outstanding creditor items", async () => {
      const creditorsXml = {
        Items: {
          Item: [
            { ItemID: "PO001", AccountCode: "2100", Amount: 2000, Date: "2024-04-10", DaysOverdue: 2 }
          ]
        }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(creditorsXml);

      const service = new AccountingService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getOutstandingCreditorItems(42);

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Accounting",
        method: "OutstandingCreditorItems",
        args: { sessionID: "SESSION-ABC123", administrationID: 42 }
      });

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(2000);
    });

    it("should fetch net revenue for date range", async () => {
      const revenueXml = {
        TotalRevenue: 50000,
        TotalExpenses: 30000,
        NetIncome: 20000
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(revenueXml);

      const service = new AccountingService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getNetRevenue(42, "2024-05-01", "2024-05-31");

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Accounting",
        method: "NetRevenue",
        args: {
          sessionID: "SESSION-ABC123",
          administrationID: 42,
          dateFrom: "2024-05-01",
          dateTo: "2024-05-31"
        }
      });

      expect(result).toEqual({
        period: "2024-05-01 to 2024-05-31",
        totalRevenue: 50000,
        totalExpenses: 30000,
        netIncome: 20000,
        rawData: revenueXml
      });
    });
  });

  describe("AccountingInfoService", () => {
    it("should fetch GL account scheme", async () => {
      const schemeXml = {
        Accounts: {
          Account: [
            { Code: "1000", Name: "Bank", Type: "Asset" },
            { Code: "2000", Name: "Creditors", Type: "Liability" },
            { Code: "3000", Name: "Capital", Type: "Equity" }
          ]
        }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(schemeXml);

      const service = new AccountingInfoService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getGLAccountScheme(42);

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "AccountingInfo",
        method: "GetGLAccountScheme",
        args: { sessionID: "SESSION-ABC123", administrationID: 42 }
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        accountCode: "1000",
        accountName: "Bank",
        accountType: "Asset",
        rawData: schemeXml.Accounts.Account[0]
      });
    });

    it("should search transactions with optional filters", async () => {
      const transactionsXml = {
        Transactions: {
          Transaction: [
            { TransactionID: "TXN001", Date: "2024-05-01", Amount: 1000, Description: "Sale", AccountCode: "4000" }
          ]
        }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(transactionsXml);

      const service = new AccountingInfoService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getTransactions(42, "2024-05-01", "2024-05-31", "4000");

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "AccountingInfo",
        method: "GetTransactions",
        args: {
          sessionID: "SESSION-ABC123",
          administrationID: 42,
          dateFrom: "2024-05-01",
          dateTo: "2024-05-31",
          accountCode: "4000"
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(1000);
    });

    it("should fetch transaction details", async () => {
      const txnDetailsXml = {
        TransactionID: "TXN001",
        Date: "2024-05-01",
        Description: "Customer Invoice",
        Amount: 5000,
        AccountCode: "1200",
        Status: "Posted"
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(txnDetailsXml);

      const service = new AccountingInfoService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getTransactionDetails("TXN001");

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "AccountingInfo",
        method: "GetTransactionDetails",
        args: { sessionID: "SESSION-ABC123", transactionID: "TXN001" }
      });

      expect(result).toEqual({
        transactionId: "TXN001",
        date: "2024-05-01",
        description: "Customer Invoice",
        amount: 5000,
        accountCode: "1200",
        status: "Posted",
        rawData: txnDetailsXml
      });
    });
  });

  describe("YukiClient Accounting Methods", () => {
    it("should get trial balance via client", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(
          `<?xml version="1.0"?>
           <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
             <soap:Body>
               <GLAccountBalanceResponse xmlns="http://www.theyukicompany.com/">
                 <GLAccountBalanceResult>
                   <GLAccounts>
                     <GLAccount><AccountCode>1000</AccountCode><AccountName>Assets</AccountName><DebitBalance>10000</DebitBalance><CreditBalance>0</CreditBalance></GLAccount>
                   </GLAccounts>
                 </GLAccountBalanceResult>
               </GLAccountBalanceResponse>
             </soap:Body>
           </soap:Envelope>`
        )
      } as Response);

      const client = new YukiClient({
        accessKey: "test-key-12345"
      });

      const result = await client.getTrialBalance(42);

      expect(result.ok).toBe(true);
      expect(result.service).toBe("Accounting");
      expect(result.method).toBe("GLAccountBalance");
      expect(result.administrationId).toBe("42");
      expect(Array.isArray(result.data)).toBe(true);
    });

    it("should get receivables summary via client", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(
          `<?xml version="1.0"?>
           <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
             <soap:Body>
               <AuthenticateResponse xmlns="http://www.theyukicompany.com/">
                 <AuthenticateResult>SESSION-123</AuthenticateResult>
               </AuthenticateResponse>
             </soap:Body>
           </soap:Envelope>`
        )
      } as Response);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(
          `<?xml version="1.0"?>
           <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
             <soap:Body>
               <OutstandingDebtorItemsResponse xmlns="http://www.theyukicompany.com/">
                 <OutstandingDebtorItemsResult>
                   <Items>
                     <Item><ItemID>INV001</ItemID><Amount>5000</Amount><DaysOverdue>5</DaysOverdue></Item>
                   </Items>
                 </OutstandingDebtorItemsResult>
               </OutstandingDebtorItemsResponse>
             </soap:Body>
           </soap:Envelope>`
        )
      } as Response);

      const client = new YukiClient({
        accessKey: "test-key-12345"
      });

      const result = await client.getReceivablesSummary(42);

      expect(result.ok).toBe(true);
      expect(result.service).toBe("Accounting");
      expect(result.administrationId).toBe("42");
      expect(result.data).toHaveProperty("totalOutstanding");
      expect(result.data).toHaveProperty("totalOverdue");
      expect(result.data).toHaveProperty("itemCount");
    });

    it("should get profit and loss via client", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(
          `<?xml version="1.0"?>
           <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
             <soap:Body>
               <AuthenticateResponse xmlns="http://www.theyukicompany.com/">
                 <AuthenticateResult>SESSION-123</AuthenticateResult>
               </AuthenticateResponse>
             </soap:Body>
           </soap:Envelope>`
        )
      } as Response);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(
          `<?xml version="1.0"?>
           <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
             <soap:Body>
               <NetRevenueResponse xmlns="http://www.theyukicompany.com/">
                 <NetRevenueResult>
                   <TotalRevenue>100000</TotalRevenue>
                   <TotalExpenses>60000</TotalExpenses>
                   <NetIncome>40000</NetIncome>
                 </NetRevenueResult>
               </NetRevenueResponse>
             </soap:Body>
           </soap:Envelope>`
        )
      } as Response);

      const client = new YukiClient({
        accessKey: "test-key-12345"
      });

      const result = await client.getProfitAndLoss(42, "2024-05-01", "2024-05-31");

      expect(result.ok).toBe(true);
      expect(result.service).toBe("Accounting");
      expect(result.data).toHaveProperty("totalRevenue", 100000);
      expect(result.data).toHaveProperty("netIncome", 40000);
    });
  });

  describe("Error Handling", () => {
    it("should handle empty GL account balance", async () => {
      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const service = new AccountingService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getGLAccountBalance(42);

      expect(result).toHaveLength(0);
    });

    it("should handle missing optional fields safely", async () => {
      const txnXml = {
        Transactions: {
          Transaction: { TransactionID: "TXN001", Amount: 1000 }
        }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(txnXml);

      const service = new AccountingInfoService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getTransactions(42);

      expect(result).toHaveLength(1);
      expect(result[0].transactionId).toBe("TXN001");
      expect(result[0].amount).toBe(1000);
      expect(result[0].date).toBeUndefined();
    });

    it("should handle numeric value coercion", async () => {
      const balanceXml = {
        GLAccount: {
          AccountCode: "1000",
          DebitBalance: "5000.50",
          CreditBalance: "0"
        }
      };

      (mockSoapClient.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(balanceXml);

      const service = new AccountingService(
        mockSoapClient as YukiSoapClient,
        mockSessionManager as YukiSessionManager
      );

      const result = await service.getGLAccountBalance(42);

      expect(result[0].debitBalance).toBe(5000.5);
      expect(result[0].creditBalance).toBe(0);
    });
  });
});
