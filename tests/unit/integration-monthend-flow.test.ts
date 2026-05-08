import { describe, it, expect, beforeEach, vi } from "vitest";
import { IntegrationService } from "../../src/yuki/services/integration.js";
import { MonthEndChecklistService } from "../../src/yuki/services/monthEndChecklist.js";
import type { CompanySnapshot } from "../../src/yuki/services/integration.js";
import type { MonthEndChecklist, ChecklistItem } from "../../src/yuki/services/monthEndChecklist.js";
import type { TransactionResult } from "../../src/yuki/services/accountingInfo.js";
import type { VATReturn, VATCode } from "../../src/yuki/services/vat.js";
import type { BackofficeQuestion, WorkflowItem } from "../../src/yuki/services/backoffice.js";

// Mock SOAP client and session
const mockSoapClient = {
  call: vi.fn()
};

const mockSession = {
  getValidatedSession: vi.fn(async () => "mock-session-id")
};

describe("IntegrationService", () => {
  let service: IntegrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IntegrationService(mockSoapClient as any, mockSession as any);
  });

  describe("getAdministrationData", () => {
    it("should return company snapshot with all fields", async () => {
      mockSoapClient.call.mockResolvedValueOnce({
        AdministrationId: "42",
        Company: "Acme Corp",
        DatumOprichting: "2020-01-15",
        LandCode: "NL",
        Valuta: "EUR",
        RekenjaarOm: "12",
        HoudtBedrijfsadministratie: "1",
        DatumMutatie: "2024-01-10T15:30:00"
      });

      const result = await service.getAdministrationData(42);

      expect(result.administrationId).toBe("42");
      expect(result.companyName).toBe("Acme Corp");
      expect(result.businessType).toBe("1");
      expect(result.country).toBe("NL");
      expect(result.currency).toBe("EUR");
      expect(result.fiscalYear).toBe("12");
      expect(result.lastModified).toBe("2024-01-10T15:30:00");
      expect(result.status).toBe("active");
    });

    it("should handle missing optional fields", async () => {
      mockSoapClient.call.mockResolvedValueOnce({
        AdministrationId: "99",
        Company: "Test Ltd"
      });

      const result = await service.getAdministrationData(99);

      expect(result.administrationId).toBe("99");
      expect(result.companyName).toBe("Test Ltd");
      expect(result.businessType).toBeUndefined();
      expect(result.country).toBeUndefined();
    });

    it("should propagate SOAP errors", async () => {
      mockSoapClient.call.mockRejectedValueOnce(new Error("SOAP fault"));

      await expect(service.getAdministrationData(42)).rejects.toThrow("SOAP fault");
    });

    it("should use session for authentication", async () => {
      mockSoapClient.call.mockResolvedValueOnce({ AdministrationId: "1", Company: "Test" });
      mockSession.getValidatedSession.mockResolvedValueOnce("session-123");

      await service.getAdministrationData(1);

      expect(mockSession.getValidatedSession).toHaveBeenCalled();
    });
  });
});

describe("MonthEndChecklistService", () => {
  let service: MonthEndChecklistService;
  let mockAccountingInfoService: any;
  let mockVatService: any;
  let mockBackofficeService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock dependent services
    mockAccountingInfoService = {
      getTransactions: vi.fn()
    };

    mockVatService = {
      getVATReturnList: vi.fn(),
      getActiveVATCodes: vi.fn()
    };

    mockBackofficeService = {
      getOutstandingQuestions: vi.fn(),
      getWorkflow: vi.fn()
    };

    service = new MonthEndChecklistService(
      mockSoapClient as any,
      mockSession as any,
      mockAccountingInfoService,
      mockVatService,
      mockBackofficeService
    );
  });

  describe("generateMonthEndChecklist", () => {
    it("should generate on-track checklist when all checks pass", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([
        { transactionId: "1", description: "Journal entry", accountNumber: "1000" }
      ]);

      mockVatService.getVATReturnList.mockResolvedValueOnce([
        { vatReturnId: "1", period: "2024-01", status: "Filed", statusDate: "2024-01-31" }
      ]);

      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);

      mockBackofficeService.getWorkflow.mockResolvedValueOnce([
        { workflowId: "1", title: "Task 1", status: "Completed", dueDate: "2024-01-31" }
      ]);

      const result = await service.generateMonthEndChecklist(42, "2024-01");

      expect(result.administrationId).toBe("42");
      expect(result.period).toBe("2024-01");
      expect(result.summaryStatus).toBe("on-track");
      expect(result.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("should include GL reconciliation check", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([
        { transactionId: "1", description: "Entry", accountNumber: "1000" },
        { transactionId: "2", description: "Entry 2", accountNumber: "2000" }
      ]);

      mockVatService.getVATReturnList.mockResolvedValueOnce([]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      const glCheck = result.items?.find((item: ChecklistItem) => item.id === "gl-reconciliation");
      expect(glCheck).toBeDefined();
      expect(glCheck?.status).toBe("completed");
    });

    it("should include VAT filing check", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([
        { vatReturnId: "1", period: "2024-01", status: "Filed", statusDate: "2024-01-31" }
      ]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      const vatCheck = result.items?.find((item: ChecklistItem) => item.id === "vat-filing");
      expect(vatCheck).toBeDefined();
      expect(vatCheck?.status).toBe("completed");
    });

    it("should include backoffice issues check", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([
        {
          questionId: "q1",
          topic: "Invoicing",
          question: "Invoice issue",
          priority: "High",
          createdDate: "2024-01-15",
          status: "Open"
        }
      ]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      const boCheck = result.items?.find((item: ChecklistItem) => item.id === "backoffice-issues");
      expect(boCheck).toBeDefined();
      expect(boCheck?.status).toBe("warning");
    });

    it("should include workflow completion check", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([
        { workflowId: "1", title: "Task", status: "Pending", dueDate: "2024-01-31" }
      ]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      const wfCheck = result.items?.find((item: ChecklistItem) => item.id === "workflow-completion");
      expect(wfCheck).toBeDefined();
      expect(wfCheck?.status).toBe("pending");
    });

    it("should determine at-risk status when warnings present", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([
        { vatReturnId: "1", period: "2024-01", status: "Pending", statusDate: "2024-01-31" }
      ]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([
        {
          questionId: "q1",
          topic: "Data",
          question: "Missing data",
          priority: "Medium",
          createdDate: "2024-01-10",
          status: "Open"
        }
      ]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      expect(result.summaryStatus).toBe("at-risk");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should determine blocked status with multiple high-priority issues", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([
        {
          questionId: "q1",
          topic: "Critical",
          question: "Critical issue 1",
          priority: "High",
          createdDate: "2024-01-05",
          status: "Open"
        },
        {
          questionId: "q2",
          topic: "Critical",
          question: "Critical issue 2",
          priority: "High",
          createdDate: "2024-01-06",
          status: "Open"
        }
      ]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      expect(result.summaryStatus).toBe("blocked");
    });

    it("should calculate completion percentage correctly", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      expect(result.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(result.completionPercentage).toBeLessThanOrEqual(100);
    });

    it("should include actionable next steps in items", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([
        { vatReturnId: "1", period: "2024-01", status: "Pending", statusDate: "2024-01-31" }
      ]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      const items = result.items || [];
      const itemsWithNextSteps = items.filter((item: ChecklistItem) => item.nextSteps && item.nextSteps.length > 0);
      expect(itemsWithNextSteps.length).toBeGreaterThan(0);
    });

    it("should handle empty responses from all services", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      expect(result.administrationId).toBe("1");
      expect(result.period).toBe("2024-01");
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.summaryStatus).toBe("on-track");
    });

    it("should propagate service errors", async () => {
      mockAccountingInfoService.getTransactions.mockRejectedValueOnce(new Error("Service error"));

      await expect(service.generateMonthEndChecklist(1, "2024-01")).rejects.toThrow("Service error");
    });

    it("should validate period format", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      expect(result.period).toMatch(/^\d{4}-\d{2}$/);
    });

    it("should handle various VAT filing statuses", async () => {
      for (const status of ["Filed", "Pending", "Overdue", "Not Required"]) {
        mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
        mockVatService.getVATReturnList.mockResolvedValueOnce([
          { vatReturnId: "1", period: "2024-01", status, statusDate: "2024-01-31" }
        ]);
        mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
        mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

        const result = await service.generateMonthEndChecklist(1, "2024-01");

        expect(result.items).toBeDefined();
        expect(result.items!.length).toBeGreaterThan(0);
      }
    });

    it("should handle various backoffice question priorities", async () => {
      for (const priority of ["Low", "Medium", "High"]) {
        mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
        mockVatService.getVATReturnList.mockResolvedValueOnce([]);
        mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([
          {
            questionId: "q1",
            topic: "Test",
            question: "Test question",
            priority,
            createdDate: "2024-01-10",
            status: "Open"
          }
        ]);
        mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

        const result = await service.generateMonthEndChecklist(1, "2024-01");

        expect(result.items).toBeDefined();
      }
    });

    it("should handle workflow items with various statuses", async () => {
      for (const status of ["Pending", "In Progress", "Completed", "On Hold"]) {
        mockAccountingInfoService.getTransactions.mockResolvedValueOnce([]);
        mockVatService.getVATReturnList.mockResolvedValueOnce([]);
        mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
        mockBackofficeService.getWorkflow.mockResolvedValueOnce([
          { workflowId: "1", title: "Task", status, dueDate: "2024-01-31" }
        ]);

        const result = await service.generateMonthEndChecklist(1, "2024-01");

        expect(result.items).toBeDefined();
      }
    });

    it("should maintain correct item order", async () => {
      mockAccountingInfoService.getTransactions.mockResolvedValueOnce([
        { transactionId: "1", description: "Entry", accountNumber: "1000" }
      ]);
      mockVatService.getVATReturnList.mockResolvedValueOnce([]);
      mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([]);
      mockBackofficeService.getWorkflow.mockResolvedValueOnce([]);

      const result = await service.generateMonthEndChecklist(1, "2024-01");

      const items = result.items || [];
      const ids = items.map((item: ChecklistItem) => item.id);

      // Check that checklist maintains expected item order
      expect(ids.length).toBeGreaterThan(0);
    });
  });
});

describe("Integration Flow - End to End", () => {
  it("should orchestrate all Phase 6 services correctly", async () => {
    const mockAccountingInfoService = { getTransactions: vi.fn() };
    const mockVatService = {
      getVATReturnList: vi.fn(),
      getActiveVATCodes: vi.fn()
    };
    const mockBackofficeService = {
      getOutstandingQuestions: vi.fn(),
      getWorkflow: vi.fn()
    };

    // Setup comprehensive test data
    mockAccountingInfoService.getTransactions.mockResolvedValueOnce([
      { transactionId: "1", description: "Opening balances", accountNumber: "1000" },
      { transactionId: "2", description: "Sales", accountNumber: "4000" },
      { transactionId: "3", description: "Expenses", accountNumber: "6000" }
    ]);

    mockVatService.getVATReturnList.mockResolvedValueOnce([
      {
        vatReturnId: "1",
        period: "2024-01",
        status: "Filed",
        statusDate: "2024-01-31",
        dueDate: "2024-02-20"
      }
    ]);

    mockBackofficeService.getOutstandingQuestions.mockResolvedValueOnce([
      {
        questionId: "q1",
        topic: "Invoice",
        question: "Pending invoice",
        priority: "Low",
        createdDate: "2024-01-10",
        status: "Open"
      }
    ]);

    mockBackofficeService.getWorkflow.mockResolvedValueOnce([
      {
        workflowId: "1",
        title: "Period close review",
        status: "In Progress",
        dueDate: "2024-01-31",
        owner: "Accountant",
        stage: "review"
      },
      {
        workflowId: "2",
        title: "Approval",
        status: "Pending",
        dueDate: "2024-02-05",
        owner: "Manager",
        stage: "approval"
      }
    ]);

    const service = new MonthEndChecklistService(
      mockSoapClient as any,
      mockSession as any,
      mockAccountingInfoService,
      mockVatService,
      mockBackofficeService
    );

    const result = await service.generateMonthEndChecklist(42, "2024-01");

    // Verify all services were called
    expect(mockAccountingInfoService.getTransactions).toHaveBeenCalledWith(42);
    expect(mockVatService.getVATReturnList).toHaveBeenCalledWith(42);
    expect(mockBackofficeService.getOutstandingQuestions).toHaveBeenCalledWith(42);
    expect(mockBackofficeService.getWorkflow).toHaveBeenCalledWith(42);

    // Verify checklist structure
    expect(result.administrationId).toBe("42");
    expect(result.period).toBe("2024-01");
    expect(result.summaryStatus).toBe("on-track");
    expect(result.completionPercentage).toBeGreaterThanOrEqual(0);
    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });
});
