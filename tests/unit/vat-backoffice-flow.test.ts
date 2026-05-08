import { describe, it, expect, beforeEach, vi } from "vitest";
import { VatService } from "../../src/yuki/services/vat.js";
import { BackofficeService } from "../../src/yuki/services/backoffice.js";
import type { YukiSoapClient } from "../../src/yuki/soap.js";
import type { YukiSessionManager } from "../../src/yuki/auth.js";

// Mock SOAP responses
const mockSoapClient: Partial<YukiSoapClient> = {
  call: vi.fn()
};

const mockSessionManager: Partial<YukiSessionManager> = {
  getSessionId: vi.fn().mockResolvedValue("test-session-id-12345")
};

describe("VAT Service", () => {
  let vatService: VatService;

  beforeEach(() => {
    vi.clearAllMocks();
    vatService = new VatService(
      mockSoapClient as YukiSoapClient,
      mockSessionManager as YukiSessionManager
    );
  });

  describe("getVATReturnList", () => {
    it("should return VAT returns for administration", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        VATReturns: {
          VATReturn: [
            {
              VATReturnID: "vat_2024_q1",
              Period: "2024-Q1",
              Status: "Filed",
              StatusDate: "2024-04-15",
              DueDate: "2024-04-20"
            },
            {
              VATReturnID: "vat_2024_q2",
              Period: "2024-Q2",
              Status: "Draft",
              StatusDate: "2024-07-01",
              DueDate: "2024-07-20"
            }
          ]
        }
      });

      const result = await vatService.getVATReturnList(123);

      expect(result).toHaveLength(2);
      expect(result[0].vatReturnId).toBe("vat_2024_q1");
      expect(result[0].status).toBe("Filed");
      expect(result[1].vatReturnId).toBe("vat_2024_q2");
      expect(result[1].status).toBe("Draft");
    });

    it("should return empty array when no VAT returns", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      const result = await vatService.getVATReturnList(123);

      expect(result).toEqual([]);
    });

    it("should support period filtering", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      await vatService.getVATReturnList(123, "2024-01", "2024-06");

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Vat",
        method: "VATReturnList",
        args: {
          sessionID: "test-session-id-12345",
          administrationID: 123,
          fromPeriod: "2024-01",
          toPeriod: "2024-06"
        }
      });
    });

    it("should handle single VAT return response", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        VATReturn: {
          VATReturnID: "vat_single",
          Period: "2024-Q1",
          Status: "Filed"
        }
      });

      const result = await vatService.getVATReturnList(123);

      expect(result).toHaveLength(1);
      expect(result[0].vatReturnId).toBe("vat_single");
    });

    it("should handle alternative field names", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        VATReturn: {
          ID: "alt_id",
          State: "Pending",
          ModifiedDate: "2024-06-01"
        }
      });

      const result = await vatService.getVATReturnList(123);

      expect(result[0].vatReturnId).toBe("alt_id");
      expect(result[0].status).toBe("Pending");
      expect(result[0].statusDate).toBe("2024-06-01");
    });
  });

  describe("getActiveVATCodes", () => {
    it("should return active VAT codes with rates", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        VATCodes: {
          VATCode: [
            {
              VATCodeID: "code_21",
              Code: "21%",
              Description: "Standard rate Belgium",
              Percentage: 21,
              Type: "Standard"
            },
            {
              VATCodeID: "code_6",
              Code: "6%",
              Description: "Reduced rate Belgium",
              Percentage: 6,
              Type: "Reduced"
            },
            {
              VATCodeID: "code_0",
              Code: "0%",
              Description: "Zero rate (export)",
              Percentage: 0,
              Type: "Zero"
            }
          ]
        }
      });

      const result = await vatService.getActiveVATCodes(456);

      expect(result).toHaveLength(3);
      expect(result[0].code).toBe("21%");
      expect(result[0].percentage).toBe(21);
      expect(result[1].code).toBe("6%");
      expect(result[2].percentage).toBe(0);
    });

    it("should return empty array when no VAT codes", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      const result = await vatService.getActiveVATCodes(456);

      expect(result).toEqual([]);
    });

    it("should handle single VAT code response", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        VATCode: {
          VATCodeID: "single_code",
          Code: "21%",
          Percentage: 21
        }
      });

      const result = await vatService.getActiveVATCodes(456);

      expect(result).toHaveLength(1);
      expect(result[0].vatCodeId).toBe("single_code");
    });

    it("should handle alternative field names", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        VATCode: {
          ID: "alt_code",
          Rate: 19,
          VATType: "Special"
        }
      });

      const result = await vatService.getActiveVATCodes(456);

      expect(result[0].vatCodeId).toBe("alt_code");
      expect(result[0].percentage).toBe(19);
      expect(result[0].type).toBe("Special");
    });

    it("should pass administrationId correctly", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      await vatService.getActiveVATCodes(789);

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Vat",
        method: "ActiveVATCodesList",
        args: {
          sessionID: "test-session-id-12345",
          administrationID: 789
        }
      });
    });
  });
});

describe("Backoffice Service", () => {
  let backofficeService: BackofficeService;

  beforeEach(() => {
    vi.clearAllMocks();
    backofficeService = new BackofficeService(
      mockSoapClient as YukiSoapClient,
      mockSessionManager as YukiSessionManager
    );
  });

  describe("getOutstandingQuestions", () => {
    it("should return outstanding back-office questions", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Questions: {
          Question: [
            {
              QuestionID: "q1",
              Topic: "Bank reconciliation",
              Question: "Please reconcile bank account for June",
              Priority: "High",
              CreatedDate: "2024-07-01",
              Status: "Open"
            },
            {
              QuestionID: "q2",
              Topic: "Invoice validation",
              Question: "Invalid invoice reference found",
              Priority: "Medium",
              CreatedDate: "2024-07-02",
              Status: "In Progress"
            }
          ]
        }
      });

      const result = await backofficeService.getOutstandingQuestions(123);

      expect(result).toHaveLength(2);
      expect(result[0].questionId).toBe("q1");
      expect(result[0].topic).toBe("Bank reconciliation");
      expect(result[0].priority).toBe("High");
      expect(result[1].questionId).toBe("q2");
      expect(result[1].status).toBe("In Progress");
    });

    it("should return empty array when no questions", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      const result = await backofficeService.getOutstandingQuestions(123);

      expect(result).toEqual([]);
    });

    it("should handle single question response", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Question: {
          QuestionID: "q_single",
          Topic: "Compliance",
          Status: "Pending"
        }
      });

      const result = await backofficeService.getOutstandingQuestions(123);

      expect(result).toHaveLength(1);
      expect(result[0].questionId).toBe("q_single");
    });

    it("should handle alternative field names", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Question: {
          ID: "alt_q",
          Description: "Test description",
          DateCreated: "2024-07-05",
          State: "New"
        }
      });

      const result = await backofficeService.getOutstandingQuestions(123);

      expect(result[0].questionId).toBe("alt_q");
      expect(result[0].question).toBe("Test description");
      expect(result[0].createdDate).toBe("2024-07-05");
      expect(result[0].status).toBe("New");
    });

    it("should pass administrationId correctly", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      await backofficeService.getOutstandingQuestions(999);

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Backoffice",
        method: "GetOutstandingQuestions",
        args: {
          sessionID: "test-session-id-12345",
          administrationID: 999
        }
      });
    });
  });

  describe("getWorkflow", () => {
    it("should return workflow items with status", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Workflow: {
          Item: [
            {
              WorkflowID: "wf1",
              Title: "Monthly closing",
              Status: "In Progress",
              DueDate: "2024-07-15",
              Owner: "admin@company.com",
              Stage: "Reconciliation"
            },
            {
              WorkflowID: "wf2",
              Title: "Year-end audit",
              Status: "Planned",
              DueDate: "2024-12-31",
              Owner: "auditor@firm.com",
              Stage: "Planning"
            }
          ]
        }
      });

      const result = await backofficeService.getWorkflow(456);

      expect(result).toHaveLength(2);
      expect(result[0].workflowId).toBe("wf1");
      expect(result[0].title).toBe("Monthly closing");
      expect(result[0].status).toBe("In Progress");
      expect(result[0].owner).toBe("admin@company.com");
      expect(result[1].stage).toBe("Planning");
    });

    it("should return empty array when no workflow items", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      const result = await backofficeService.getWorkflow(456);

      expect(result).toEqual([]);
    });

    it("should handle single workflow item response", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        WorkflowItem: {
          WorkflowID: "wf_single",
          Title: "Test workflow",
          Status: "Pending"
        }
      });

      const result = await backofficeService.getWorkflow(456);

      expect(result).toHaveLength(1);
      expect(result[0].workflowId).toBe("wf_single");
    });

    it("should handle alternative field names", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        WorkflowItem: {
          ID: "alt_wf",
          Name: "Alternative title",
          State: "Active",
          DateDue: "2024-08-01",
          AssignedTo: "user@example.com",
          Phase: "Review"
        }
      });

      const result = await backofficeService.getWorkflow(456);

      expect(result[0].workflowId).toBe("alt_wf");
      expect(result[0].title).toBe("Alternative title");
      expect(result[0].status).toBe("Active");
      expect(result[0].dueDate).toBe("2024-08-01");
      expect(result[0].owner).toBe("user@example.com");
      expect(result[0].stage).toBe("Review");
    });

    it("should prioritize by priority fields over alternatives", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        WorkflowItem: {
          ID: "wf",
          Title: "Primary",
          Name: "Alternative",
          Status: "Active",
          State: "Inactive"
        }
      });

      const result = await backofficeService.getWorkflow(456);

      expect(result[0].title).toBe("Primary");
      expect(result[0].status).toBe("Active");
    });

    it("should pass administrationId correctly", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      await backofficeService.getWorkflow(888);

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Backoffice",
        method: "GetWorkflow",
        args: {
          sessionID: "test-session-id-12345",
          administrationID: 888
        }
      });
    });
  });
});

describe("Phase 5 Integration Scenarios", () => {
  let vatService: VatService;
  let backofficeService: BackofficeService;

  beforeEach(() => {
    vi.clearAllMocks();
    vatService = new VatService(
      mockSoapClient as YukiSoapClient,
      mockSessionManager as YukiSessionManager
    );
    backofficeService = new BackofficeService(
      mockSoapClient as YukiSoapClient,
      mockSessionManager as YukiSessionManager
    );
  });

  it("should retrieve VAT filing status and outstanding questions", async () => {
    // First call: VAT returns
    vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
      VATReturn: {
        VATReturnID: "vat_q2",
        Period: "2024-Q2",
        Status: "Pending",
        DueDate: "2024-07-20"
      }
    });

    // Second call: Questions
    vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
      Questions: {
        Question: {
          QuestionID: "q1",
          Topic: "VAT",
          Question: "Please provide VAT reconciliation"
        }
      }
    });

    const vatResult = await vatService.getVATReturnList(123);
    const questionResult = await backofficeService.getOutstandingQuestions(123);

    expect(vatResult).toHaveLength(1);
    expect(vatResult[0].status).toBe("Pending");
    expect(questionResult).toHaveLength(1);
    expect(questionResult[0].topic).toBe("VAT");
  });

  it("should handle multiple VAT codes and workflow items in month-end process", async () => {
    // VAT codes available
    vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
      VATCodes: {
        VATCode: [
          { VATCodeID: "c1", Code: "21%", Percentage: 21 },
          { VATCodeID: "c2", Code: "6%", Percentage: 6 }
        ]
      }
    });

    // Workflow items for month-end
    vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
      Workflow: {
        Item: [
          { WorkflowID: "w1", Title: "VAT review", Status: "In Progress" },
          { WorkflowID: "w2", Title: "Bank reconciliation", Status: "Pending" },
          { WorkflowID: "w3", Title: "Final approval", Status: "Waiting" }
        ]
      }
    });

    const vatCodes = await vatService.getActiveVATCodes(123);
    const workflow = await backofficeService.getWorkflow(123);

    expect(vatCodes).toHaveLength(2);
    expect(vatCodes[0].percentage).toBe(21);
    expect(workflow).toHaveLength(3);
    expect(workflow.filter((w) => w.status === "In Progress")).toHaveLength(1);
  });

  it("should handle empty results gracefully", async () => {
    vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});
    vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});
    vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});
    vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

    const vatReturns = await vatService.getVATReturnList(123);
    const vatCodes = await vatService.getActiveVATCodes(123);
    const questions = await backofficeService.getOutstandingQuestions(123);
    const workflow = await backofficeService.getWorkflow(123);

    expect(vatReturns).toEqual([]);
    expect(vatCodes).toEqual([]);
    expect(questions).toEqual([]);
    expect(workflow).toEqual([]);
  });
});
