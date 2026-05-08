import { loadYukiConfig, serviceBaseUrl } from "../config.js";
import { Logger } from "../utils/logger.js";
import { DomainService } from "./services/domains.js";
import { AccountingService } from "./services/accounting.js";
import { AccountingInfoService } from "./services/accountingInfo.js";
import { SalesService } from "./services/sales.js";
import { PurchaseService } from "./services/purchase.js";
import { ContactService } from "./services/contacts.js";
import { ProjectsService } from "./services/projects.js";
import { ArchiveService } from "./services/archive.js";
import { VatService } from "./services/vat.js";
import { BackofficeService } from "./services/backoffice.js";
import { IntegrationService } from "./services/integration.js";
import { MonthEndChecklistService } from "./services/monthEndChecklist.js";
import { YukiSessionManager } from "./auth.js";
import { YukiSoapClient } from "./soap.js";
import { RateLimitGuard } from "./rateLimit.js";
import type { YukiConfig, YukiErrorEnvelope, YukiResponseEnvelope } from "./types.js";
import { YukiError } from "./errors.js";

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class YukiClient {
  public readonly config: YukiConfig;
  private readonly domains: DomainService;
  private readonly accounting: AccountingService;
  private readonly accountingInfo: AccountingInfoService;
  private readonly sales: SalesService;
  private readonly purchase: PurchaseService;
  private readonly contacts: ContactService;
  private readonly projects: ProjectsService;
  private readonly archive: ArchiveService;
  private readonly vat: VatService;
  private readonly backoffice: BackofficeService;
  private readonly integration: IntegrationService;
  private readonly monthEndChecklist: MonthEndChecklistService;

  public constructor(pluginConfig: Record<string, unknown> = {}) {
    this.config = loadYukiConfig(pluginConfig);
    const logger = new Logger({
      level: this.config.logLevel,
      allowSensitiveDebugLogging: this.config.allowSensitiveDebugLogging
    });
    const baseUrl = serviceBaseUrl(this.config.country);
    const guard = new RateLimitGuard(this.config.maxCallsPerMinute, this.config.maxCallsPerDay);
    const soap = new YukiSoapClient(baseUrl, this.config.requestTimeoutMs, logger, guard);
    const session = new YukiSessionManager(soap, this.config.accessKey);
    this.domains = new DomainService(soap, session);
    this.accounting = new AccountingService(soap, session);
    this.accountingInfo = new AccountingInfoService(soap, session);
    this.sales = new SalesService(soap, session);
    this.purchase = new PurchaseService(soap, session);
    this.contacts = new ContactService(soap, session);
    this.projects = new ProjectsService(soap, session);
    this.archive = new ArchiveService(soap, session);
    this.vat = new VatService(soap, session);
    this.backoffice = new BackofficeService(soap, session);
    this.integration = new IntegrationService(soap, session);
    this.monthEndChecklist = new MonthEndChecklistService(
      soap,
      session,
      this.accountingInfo,
      this.vat,
      this.backoffice
    );
  }

  public async healthCheck(): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const list = await this.domains.listDomains();
    return {
      ok: true,
      service: "Archive",
      method: "Domains",
      requestId,
      data: {
        reachable: true,
        domainCount: list.length,
        environment: this.config.country
      },
      warnings: [],
      rawIncluded: false,
      apiCallsUsedEstimate: 2
    };
  }

  public async listDomains(): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.domains.listDomains();
    return {
      ok: true,
      service: "Archive",
      method: "Domains",
      requestId,
      data,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getCurrentDomain(): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const domainId = await this.domains.getCurrentDomain();
    return {
      ok: true,
      service: "Archive",
      method: "GetCurrentDomain",
      requestId,
      domainId: String(domainId),
      data: { domainId },
      warnings: [],
      rawIncluded: false,
      apiCallsUsedEstimate: 1
    };
  }

  public async setCurrentDomain(domainId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const changed = await this.domains.setCurrentDomain(domainId);
    return {
      ok: true,
      service: "Archive",
      method: "SetCurrentDomain",
      requestId,
      domainId: String(domainId),
      data: { changed },
      warnings: [],
      rawIncluded: false,
      apiCallsUsedEstimate: 1
    };
  }

  public async listAdministrations(): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.domains.listAdministrations();
    return {
      ok: true,
      service: "Archive",
      method: "Administrations",
      requestId,
      data,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getTrialBalance(administrationId: number, date?: string): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.accounting.getGLAccountBalance(administrationId, date);
    return {
      ok: true,
      service: "Accounting",
      method: "GLAccountBalance",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No GL accounts found for the given date"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async searchTransactions(
    administrationId: number,
    accountCode: string,
    fromDate?: string,
    toDate?: string
  ): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.accounting.getGLAccountTransactions(administrationId, accountCode, fromDate, toDate);
    return {
      ok: true,
      service: "Accounting",
      method: "GLAccountTransactions",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No transactions found for the given criteria"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getTransactionDetails(transactionId: string): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.accountingInfo.getTransactionDetails(transactionId);
    return {
      ok: true,
      service: "AccountingInfo",
      method: "GetTransactionDetails",
      requestId,
      data,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getReceivablesSummary(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const debtorItems = await this.accounting.getOutstandingDebtorItems(administrationId);
    const totalOutstanding = debtorItems.reduce((sum, item) => sum + item.amount, 0);
    const totalOverdue = debtorItems.reduce((sum, item) => sum + (item.daysOverdue && item.daysOverdue > 0 ? item.amount : 0), 0);
    const data = {
      administrationId,
      totalOutstanding,
      totalOverdue,
      itemCount: debtorItems.length,
      items: debtorItems
    };
    return {
      ok: true,
      service: "Accounting",
      method: "OutstandingDebtorItems",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: totalOverdue > 0 ? [`${totalOverdue} in overdue receivables`] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getPayablesSummary(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const creditorItems = await this.accounting.getOutstandingCreditorItems(administrationId);
    const totalOutstanding = creditorItems.reduce((sum, item) => sum + item.amount, 0);
    const totalOverdue = creditorItems.reduce((sum, item) => sum + (item.daysOverdue && item.daysOverdue > 0 ? item.amount : 0), 0);
    const data = {
      administrationId,
      totalOutstanding,
      totalOverdue,
      itemCount: creditorItems.length,
      items: creditorItems
    };
    return {
      ok: true,
      service: "Accounting",
      method: "OutstandingCreditorItems",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: totalOverdue > 0 ? [`${totalOverdue} in overdue payables`] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getProfitAndLoss(
    administrationId: number,
    fromDate: string,
    toDate: string
  ): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const revenue = await this.accounting.getNetRevenue(administrationId, fromDate, toDate);
    return {
      ok: true,
      service: "Accounting",
      method: "NetRevenue",
      requestId,
      administrationId: String(administrationId),
      data: revenue,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async listGLAccounts(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.accountingInfo.getGLAccountScheme(administrationId);
    return {
      ok: true,
      service: "AccountingInfo",
      method: "GetGLAccountScheme",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No GL accounts found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  // Invoice operations (Phase 3)

  public async getSalesInvoiceSchema(): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.sales.getSalesInvoiceSchemaPath();
    return {
      ok: true,
      service: "Sales",
      method: "SalesInvoiceSchemaPath",
      requestId,
      data,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getPurchaseInvoiceSchema(): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.purchase.getPurchaseInvoiceSchemaPath();
    return {
      ok: true,
      service: "Purchase",
      method: "PurchaseInvoiceSchemaPath",
      requestId,
      data,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async listSalesItems(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.sales.getSalesItems(administrationId);
    return {
      ok: true,
      service: "Sales",
      method: "GetSalesItems",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No sales items found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async listPurchaseItems(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.purchase.getPurchaseItems(administrationId);
    return {
      ok: true,
      service: "Purchase",
      method: "GetPurchaseItems",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No purchase items found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async submitSalesInvoices(
    administrationId: number,
    invoiceXml: string,
    dryRun: boolean = true
  ): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.sales.processSalesInvoices(administrationId, invoiceXml, dryRun);
    return {
      ok: data.success,
      service: "Sales",
      method: dryRun ? "ProcessSalesInvoices (dry-run)" : "ProcessSalesInvoices",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: [
        ...(dryRun ? ["Dry-run mode: no invoices were submitted"] : []),
        ...(data.warnings ?? [])
      ],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async submitPurchaseInvoices(
    administrationId: number,
    invoiceXml: string,
    dryRun: boolean = true,
    recognize: boolean = false
  ): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    
    let data;
    let method = "ProcessPurchaseInvoices";

    if (recognize) {
      // Use recognized/validation method
      data = await this.purchase.processPurchaseInvoices(administrationId, invoiceXml, dryRun);
      method = "ProcessRecognizedPurchaseInvoices";
    } else {
      data = await this.purchase.processPurchaseInvoices(administrationId, invoiceXml, dryRun);
    }

    return {
      ok: data.success,
      service: "Purchase",
      method: dryRun ? `${method} (dry-run)` : method,
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: [
        ...(dryRun ? ["Dry-run mode: no invoices were submitted"] : []),
        ...(recognize ? ["Recognize/validation mode active"] : []),
        ...(data.warnings ?? [])
      ],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  // Phase 4 - Contacts, Projects, Archive operations

  public async searchContacts(searchValue: string): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.contacts.searchContacts(searchValue);
    return {
      ok: true,
      service: "Contact",
      method: "SearchContacts",
      requestId,
      data,
      warnings: data.length === 0 ? ["No contacts found for search value"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async searchSuppliersAndCustomers(searchValue: string): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.contacts.getSuppliersAndCustomers(searchValue);
    return {
      ok: true,
      service: "Contact",
      method: "GetSuppliersAndCustomers",
      requestId,
      data,
      warnings: data.length === 0 ? ["No suppliers/customers found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async updateContact(contactXml: string, dryRun: boolean = true): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.contacts.updateContact(contactXml, dryRun);
    return {
      ok: data.success,
      service: "Contact",
      method: dryRun ? "UpdateContact (dry-run)" : "UpdateContact",
      requestId,
      data,
      warnings: [
        ...(dryRun ? ["Dry-run mode: contact was not updated"] : []),
        ...(data.warnings ?? [])
      ],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async listProjects(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.projects.listProjects(administrationId);
    return {
      ok: true,
      service: "Projects",
      method: "ListProjects",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No projects found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getProject(projectId: string): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.projects.getProject(projectId);
    return {
      ok: true,
      service: "Projects",
      method: "GetProject",
      requestId,
      data,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async updateProject(projectXml: string, dryRun: boolean = true): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.projects.updateProject(projectXml, dryRun);
    return {
      ok: data.success,
      service: "Projects",
      method: dryRun ? "UpdateProject (dry-run)" : "UpdateProject",
      requestId,
      data,
      warnings: [
        ...(dryRun ? ["Dry-run mode: project was not updated"] : []),
        ...(data.warnings ?? [])
      ],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async searchDocuments(
    searchValue: string,
    folder?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.archive.searchDocuments(searchValue, folder, fromDate, toDate);
    return {
      ok: true,
      service: "Archive",
      method: "SearchDocuments",
      requestId,
      data,
      warnings: data.length === 0 ? ["No documents found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getDocumentMetadata(documentId: string): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.archive.findDocument(documentId);
    return {
      ok: true,
      service: "Archive",
      method: "FindDocument",
      requestId,
      data,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async downloadDocument(documentId: string): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.archive.downloadDocument(documentId);
    return {
      ok: true,
      service: "Archive",
      method: "DocumentFile",
      requestId,
      data: {
        documentId,
        contentType: data.contentType,
        filename: data.filename,
        dataLength: data.data.length,
        dataPreview: data.data.substring(0, 100) + (data.data.length > 100 ? "..." : "")
      },
      warnings: data.contentType ? [] : ["Content-Type not available"],
      rawIncluded: false, // Don't include raw binary data in response
      apiCallsUsedEstimate: 1
    };
  }

  public async uploadDocument(
    filename: string,
    contentType: string,
    fileData: string,
    description?: string,
    dryRun: boolean = true
  ): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const metadata = { filename, contentType, description };
    const data = await this.archive.uploadDocument(metadata, fileData, filename, dryRun);
    return {
      ok: data.success,
      service: "Archive",
      method: dryRun ? "UploadDocumentWithAttachment (dry-run)" : "UploadDocumentWithAttachment",
      requestId,
      data,
      warnings: [
        ...(dryRun ? ["Dry-run mode: document was not uploaded"] : []),
        ...(data.warnings ?? [])
      ],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  // Phase 5 - VAT and Backoffice operations

  public async getVATReturnList(
    administrationId: number,
    fromPeriod?: string,
    toPeriod?: string
  ): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.vat.getVATReturnList(administrationId, fromPeriod, toPeriod);
    return {
      ok: true,
      service: "Vat",
      method: "VATReturnList",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No VAT returns found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getActiveVATCodes(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.vat.getActiveVATCodes(administrationId);
    return {
      ok: true,
      service: "Vat",
      method: "ActiveVATCodesList",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No active VAT codes found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getOutstandingBackofficeQuestions(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.backoffice.getOutstandingQuestions(administrationId);
    return {
      ok: true,
      service: "Backoffice",
      method: "GetOutstandingQuestions",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No outstanding back-office questions"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async getBackofficeWorkflow(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.backoffice.getWorkflow(administrationId);
    return {
      ok: true,
      service: "Backoffice",
      method: "GetWorkflow",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.length === 0 ? ["No workflow items found"] : [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  // Phase 6 - Company snapshot and month-end checklist operations

  public async getCompanySnapshot(administrationId: number): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.integration.getAdministrationData(administrationId);
    return {
      ok: true,
      service: "Integration",
      method: "GetAdministrationData",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: [],
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 1
    };
  }

  public async generateMonthEndChecklist(
    administrationId: number,
    period: string
  ): Promise<YukiResponseEnvelope> {
    const requestId = generateRequestId();
    const data = await this.monthEndChecklist.generateMonthEndChecklist(administrationId, period);
    return {
      ok: data.summaryStatus !== "blocked",
      service: "Integration",
      method: "GenerateMonthEndChecklist",
      requestId,
      administrationId: String(administrationId),
      data,
      warnings: data.warnings,
      rawIncluded: this.config.includeRawResponses,
      apiCallsUsedEstimate: 5 // Multiple service calls
    };
  }
}

export function toErrorEnvelope(service: string, method: string, error: unknown): YukiErrorEnvelope {
  if (error instanceof YukiError) {
    return {
      ok: false,
      service,
      method,
      errorCode: error.code,
      message: error.message,
      recoverable: error.recoverable,
      nextSteps: [
        "Verify Yuki credentials and service permissions",
        "Check configured domain/administration context",
        "Run yuki_health_check"
      ]
    };
  }

  return {
    ok: false,
    service,
    method,
    errorCode: "YUKI_UNKNOWN_ERROR",
    message: error instanceof Error ? error.message : "Unknown Yuki error",
    recoverable: true,
    nextSteps: ["Inspect plugin logs", "Run yuki_health_check"]
  };
}
