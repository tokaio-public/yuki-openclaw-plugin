import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface BackofficeQuestion {
  questionId: string;
  topic?: string;
  question?: string;
  priority?: string;
  createdDate?: string;
  status?: string;
  rawData?: unknown;
}

export interface WorkflowItem {
  workflowId: string;
  title?: string;
  status?: string;
  dueDate?: string;
  owner?: string;
  stage?: string;
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

export class BackofficeService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async getOutstandingQuestions(administrationId: number): Promise<BackofficeQuestion[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Backoffice",
      method: "GetOutstandingQuestions",
      args: {
        sessionID,
        administrationID: administrationId
      }
    });

    const maybeRows = (raw as { Question?: unknown; Questions?: { Question?: unknown } }).Questions?.Question ??
      (raw as { Question?: unknown }).Question;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        questionId: safeString(item.QuestionID) ?? safeString(item.ID) ?? "",
        topic: safeString(item.Topic),
        question: safeString(item.Question) ?? safeString(item.Description),
        priority: safeString(item.Priority),
        createdDate: safeString(item.CreatedDate) ?? safeString(item.DateCreated),
        status: safeString(item.Status) ?? safeString(item.State),
        rawData: row
      };
    });
  }

  public async getWorkflow(administrationId: number): Promise<WorkflowItem[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Backoffice",
      method: "GetWorkflow",
      args: {
        sessionID,
        administrationID: administrationId
      }
    });

    const maybeRows = (raw as { WorkflowItem?: unknown; Workflow?: { Item?: unknown } }).Workflow?.Item ??
      (raw as { WorkflowItem?: unknown }).WorkflowItem;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        workflowId: safeString(item.WorkflowID) ?? safeString(item.ID) ?? "",
        title: safeString(item.Title) ?? safeString(item.Name),
        status: safeString(item.Status) ?? safeString(item.State),
        dueDate: safeString(item.DueDate) ?? safeString(item.DateDue),
        owner: safeString(item.Owner) ?? safeString(item.AssignedTo),
        stage: safeString(item.Stage) ?? safeString(item.Phase),
        rawData: row
      };
    });
  }
}

