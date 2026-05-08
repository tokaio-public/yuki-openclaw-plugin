import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";
import { AccountingInfoService } from "./accountingInfo.js";
import { VatService } from "./vat.js";
import { BackofficeService } from "./backoffice.js";

export interface ChecklistItem {
  id: string;
  title: string;
  status: "completed" | "pending" | "warning";
  description?: string;
  dueDate?: string;
  nextSteps?: string[];
}

export interface MonthEndChecklist {
  administrationId: string;
  period: string;
  items: ChecklistItem[];
  summaryStatus: "on-track" | "at-risk" | "blocked";
  completionPercentage: number;
  warnings: string[];
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export class MonthEndChecklistService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;
  private readonly accountingInfo: AccountingInfoService;
  private readonly vat: VatService;
  private readonly backoffice: BackofficeService;

  public constructor(
    soapClient: YukiSoapClient,
    sessionManager: YukiSessionManager,
    accountingInfo: AccountingInfoService,
    vat: VatService,
    backoffice: BackofficeService
  ) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
    this.accountingInfo = accountingInfo;
    this.vat = vat;
    this.backoffice = backoffice;
  }

  public async generateMonthEndChecklist(
    administrationId: number,
    period: string // YYYY-MM format
  ): Promise<MonthEndChecklist> {
    const items: ChecklistItem[] = [];
    const warnings: string[] = [];

    try {
      // 1. Check GL account reconciliation
      const transactions = await this.accountingInfo.getTransactions(
        administrationId,
        period
      );
      items.push({
        id: "gl-reconciliation",
        title: "GL Account Reconciliation",
        status: transactions.length > 0 ? "completed" : "pending",
        description: `${transactions.length} transactions processed`,
        nextSteps: transactions.length === 0 ? ["Process pending transactions"] : []
      });

      // 2. Check VAT filing status
      const vatReturns = await this.vat.getVATReturnList(administrationId, period, period);
      const vatStatus = vatReturns.find((r) => r.status === "Filed" || r.status === "Submitted");
      items.push({
        id: "vat-filing",
        title: "VAT Filing",
        status: vatStatus ? "completed" : "pending",
        description: vatStatus
          ? `VAT return ${vatStatus.vatReturnId} filed`
          : "VAT return pending",
        dueDate: vatReturns[0]?.dueDate,
        nextSteps: vatStatus ? [] : ["Submit VAT return"]
      });

      // 3. Check outstanding back-office questions
      const questions = await this.backoffice.getOutstandingQuestions(administrationId);
      const highPriorityQuestions = questions.filter((q) => q.priority === "High");
      items.push({
        id: "backoffice-issues",
        title: "Back-office Questions Resolution",
        status: highPriorityQuestions.length === 0 ? "completed" : "warning",
        description: `${questions.length} total questions, ${highPriorityQuestions.length} high priority`,
        nextSteps: highPriorityQuestions.length > 0
          ? highPriorityQuestions.map((q) => `Address: ${q.question}`)
          : []
      });

      // 4. Check workflow items
      const workflow = await this.backoffice.getWorkflow(administrationId);
      const pendingWorkflow = workflow.filter((w) => w.status === "Pending" || w.status === "Waiting");
      items.push({
        id: "workflow-completion",
        title: "Workflow Task Completion",
        status: pendingWorkflow.length === 0 ? "completed" : "warning",
        description: `${workflow.length} workflow items total, ${pendingWorkflow.length} pending`,
        nextSteps: pendingWorkflow.length > 0
          ? pendingWorkflow.map((w) => `Complete: ${w.title}`)
          : []
      });

      // Generate summary statistics
      const completedItems = items.filter((i) => i.status === "completed").length;
      const completionPercentage = Math.round((completedItems / items.length) * 100);

      // Determine overall status
      let summaryStatus: "on-track" | "at-risk" | "blocked" = "on-track";
      if (items.some((i) => i.status === "warning")) {
        summaryStatus = "at-risk";
      }
      if (items.some((i) => i.status === "pending")) {
        summaryStatus = "at-risk";
      }
      if (highPriorityQuestions.length > 2) {
        summaryStatus = "blocked";
      }

      // Add warnings
      if (highPriorityQuestions.length > 0) {
        warnings.push(`${highPriorityQuestions.length} high-priority back-office questions require attention`);
      }
      if (vatReturns.length === 0) {
        warnings.push("No VAT return records found for this period");
      }
      if (pendingWorkflow.length > 3) {
        warnings.push("Multiple pending workflow items may delay month-end closing");
      }

      return {
        administrationId: String(administrationId),
        period,
        items,
        summaryStatus,
        completionPercentage,
        warnings
      };
    } catch (error) {
      throw error;
    }
  }
}
