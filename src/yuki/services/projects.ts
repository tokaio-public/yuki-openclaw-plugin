import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface Project {
  projectId: string;
  projectCode?: string;
  description?: string;
  status?: string;
  budget?: number;
  spent?: number;
  rawData?: unknown;
}

export interface ProjectSearchResult {
  id: string;
  code?: string;
  description?: string;
  rawData?: unknown;
}

export interface ProjectUpdateResult {
  success: boolean;
  projectId?: string;
  validationErrors?: string[];
  warnings?: string[];
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

export class ProjectsService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async listProjects(administrationId: number): Promise<ProjectSearchResult[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Projects",
      method: "ListProjects",
      args: {
        sessionID,
        administrationID: administrationId
      }
    });

    const maybeRows = (raw as { Project?: unknown; Projects?: { Project?: unknown } }).Projects?.Project ??
      (raw as { Project?: unknown }).Project;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: safeString(item.ProjectID) ?? safeString(item.ID) ?? "",
        code: safeString(item.ProjectCode) ?? safeString(item.Code),
        description: safeString(item.Description),
        rawData: row
      };
    });
  }

  public async getProject(projectId: string): Promise<Project> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Projects",
      method: "GetProject",
      args: {
        sessionID,
        projectID: projectId
      }
    });

    const item = raw as Record<string, unknown>;
    return {
      projectId: safeString(item.ProjectID) ?? projectId,
      projectCode: safeString(item.ProjectCode) ?? safeString(item.Code),
      description: safeString(item.Description),
      status: safeString(item.Status) ?? safeString(item.State),
      budget: safeNumber(item.Budget ?? item.BudgetAmount ?? 0),
      spent: safeNumber(item.Spent ?? item.AmountSpent ?? 0),
      rawData: raw
    };
  }

  public async updateProject(
    projectXml: string,
    dryRun: boolean = true
  ): Promise<ProjectUpdateResult> {
    const sessionID = await this.sessionManager.getSessionId();

    try {
      const raw = await this.soapClient.call<unknown>({
        service: "Projects",
        method: "UpdateProject",
        args: {
          sessionID,
          xmlData: projectXml
        }
      });

      const result = raw as Record<string, unknown>;
      const errors = toArray(result.ValidationErrors ?? result.Errors);
      const warnings = toArray(result.Warnings ?? []);

      return {
        success: !dryRun && (errors.length === 0),
        projectId: safeString(result.ProjectID) ?? safeString(result.ID),
        validationErrors: errors.map((e) => safeString(e) ?? JSON.stringify(e)).filter((e) => e),
        warnings: warnings.map((w) => safeString(w) ?? JSON.stringify(w)).filter((w) => w),
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
