import type { Static } from "@sinclair/typebox";
import type { OpenClawToolRegistration } from "../types/openclaw-plugin-sdk.js";
import {
  EmptyInputSchema,
  SetCurrentDomainInputSchema,
  AdministrationIdSchema,
  DateRangeSchema,
  GLAccountSearchSchema,
  TransactionDetailSchema,
  ContactSearchSchema,
  ProjectSearchSchema,
  ProjectDetailSchema,
  DocumentSearchSchema,
  DocumentDownloadSchema,
  VATReturnListSchema,
  VATCodesSchema,
  BackofficeQuestionsSchema,
  WorkflowSchema,
  CompanySnapshotSchema,
  MonthEndChecklistSchema
} from "./schemas.js";
import { YukiClient, toErrorEnvelope } from "../yuki/client.js";

export function buildReadTools(getClient: () => YukiClient): OpenClawToolRegistration[] {
  return [
    {
      name: "yuki_health_check",
      description: "Validate Yuki connectivity and current credentials.",
      parameters: EmptyInputSchema,
      async execute(_toolCallId, _params: Static<typeof EmptyInputSchema>) {
        try {
          return { content: [{ type: "text", text: JSON.stringify(await getClient().healthCheck()) }] };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "Domains", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_list_domains",
      description: "List Yuki domains accessible for the configured API key.",
      parameters: EmptyInputSchema,
      async execute(_toolCallId, _params: Static<typeof EmptyInputSchema>) {
        try {
          return { content: [{ type: "text", text: JSON.stringify(await getClient().listDomains()) }] };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "Domains", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_current_domain",
      description: "Return the currently active Yuki domain for this session.",
      parameters: EmptyInputSchema,
      async execute(_toolCallId, _params: Static<typeof EmptyInputSchema>) {
        try {
          return { content: [{ type: "text", text: JSON.stringify(await getClient().getCurrentDomain()) }] };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "GetCurrentDomain", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_set_current_domain",
      description: "Set the active Yuki domain to use for subsequent service calls.",
      parameters: SetCurrentDomainInputSchema,
      async execute(_toolCallId, params: Static<typeof SetCurrentDomainInputSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().setCurrentDomain(params.domainId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "SetCurrentDomain", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_list_administrations",
      description: "List administrations visible for the configured session.",
      parameters: EmptyInputSchema,
      async execute(_toolCallId, _params: Static<typeof EmptyInputSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().listAdministrations()) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "Administrations", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_trial_balance",
      description: "Retrieve GL account balance (trial balance) for a given administration.",
      parameters: AdministrationIdSchema,
      async execute(_toolCallId, params: Static<typeof AdministrationIdSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getTrialBalance(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Accounting", "GLAccountBalance", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_search_transactions",
      description: "Search GL account transactions within a date range and account.",
      parameters: GLAccountSearchSchema,
      async execute(_toolCallId, params: Static<typeof GLAccountSearchSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().searchTransactions(params.administrationId, params.accountCode, params.fromDate, params.toDate)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Accounting", "GLAccountTransactions", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_transaction",
      description: "Retrieve details of a specific transaction by ID.",
      parameters: TransactionDetailSchema,
      async execute(_toolCallId, params: Static<typeof TransactionDetailSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getTransactionDetails(params.transactionId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("AccountingInfo", "GetTransactionDetails", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_receivables_summary",
      description: "Get summary of outstanding receivables (debtor items) for an administration.",
      parameters: AdministrationIdSchema,
      async execute(_toolCallId, params: Static<typeof AdministrationIdSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getReceivablesSummary(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Accounting", "OutstandingDebtorItems", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_payables_summary",
      description: "Get summary of outstanding payables (creditor items) for an administration.",
      parameters: AdministrationIdSchema,
      async execute(_toolCallId, params: Static<typeof AdministrationIdSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getPayablesSummary(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Accounting", "OutstandingCreditorItems", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_profit_and_loss",
      description: "Calculate profit and loss (net revenue vs expenses) for a date range.",
      parameters: DateRangeSchema,
      async execute(_toolCallId, params: Static<typeof DateRangeSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getProfitAndLoss(params.administrationId, params.fromDate, params.toDate)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Accounting", "NetRevenue", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_list_gl_accounts",
      description: "List all GL accounts (chart of accounts) for an administration.",
      parameters: AdministrationIdSchema,
      async execute(_toolCallId, params: Static<typeof AdministrationIdSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().listGLAccounts(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("AccountingInfo", "GetGLAccountScheme", error)) }]
          };
        }
      }
    },
    // Phase 4 - Read tools for Contacts, Projects, Archive
    {
      name: "yuki_search_contacts",
      description: "Search for contacts by name, email, or company. Returns supplier and customer records.",
      parameters: ContactSearchSchema,
      async execute(_toolCallId, params: Static<typeof ContactSearchSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().searchContacts(params.searchValue)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Contact", "SearchContacts", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_list_suppliers_customers",
      description: "List suppliers and customers matching search criteria.",
      parameters: ContactSearchSchema,
      async execute(_toolCallId, params: Static<typeof ContactSearchSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().searchSuppliersAndCustomers(params.searchValue)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Contact", "GetSuppliersAndCustomers", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_list_projects",
      description: "List all projects for a given administration.",
      parameters: ProjectSearchSchema,
      async execute(_toolCallId, params: Static<typeof ProjectSearchSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().listProjects(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Projects", "ListProjects", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_project",
      description: "Retrieve detailed information about a specific project.",
      parameters: ProjectDetailSchema,
      async execute(_toolCallId, params: Static<typeof ProjectDetailSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getProject(params.projectId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Projects", "GetProject", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_search_documents",
      description: "Search for documents in the archive by filename, content, date range, or folder.",
      parameters: DocumentSearchSchema,
      async execute(_toolCallId, params: Static<typeof DocumentSearchSchema>) {
        try {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  await getClient().searchDocuments(
                    params.searchValue,
                    params.folder,
                    params.fromDate,
                    params.toDate
                  )
                )
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "SearchDocuments", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_document_metadata",
      description: "Retrieve metadata (size, type, upload date) for a specific document.",
      parameters: DocumentDownloadSchema,
      async execute(_toolCallId, params: Static<typeof DocumentDownloadSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getDocumentMetadata(params.documentId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "FindDocument", error)) }]
          };
        }
      }
    },
    // Phase 5 - Read tools for VAT and Backoffice
    {
      name: "yuki_get_vat_return_statuses",
      description: "List VAT return statuses and filing dates for an administration, optionally filtered by period.",
      parameters: VATReturnListSchema,
      async execute(_toolCallId, params: Static<typeof VATReturnListSchema>) {
        try {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  await getClient().getVATReturnList(
                    params.administrationId,
                    params.fromPeriod,
                    params.toPeriod
                  )
                )
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Vat", "VATReturnList", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_list_vat_codes",
      description: "List active VAT codes and their tax rates for an administration.",
      parameters: VATCodesSchema,
      async execute(_toolCallId, params: Static<typeof VATCodesSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getActiveVATCodes(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Vat", "ActiveVATCodesList", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_outstanding_backoffice_questions",
      description: "List open back-office questions and tasks for an administration.",
      parameters: BackofficeQuestionsSchema,
      async execute(_toolCallId, params: Static<typeof BackofficeQuestionsSchema>) {
        try {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(await getClient().getOutstandingBackofficeQuestions(params.administrationId))
              }
            ]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Backoffice", "GetOutstandingQuestions", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_backoffice_workflow",
      description: "Retrieve the back-office workflow queue and task status for an administration.",
      parameters: WorkflowSchema,
      async execute(_toolCallId, params: Static<typeof WorkflowSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getBackofficeWorkflow(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Backoffice", "GetWorkflow", error)) }]
          };
        }
      }
    },
    // Phase 6 - Company snapshot and month-end checklist tools
    {
      name: "yuki_get_company_snapshot",
      description: "Retrieve company profile information and administration data snapshot.",
      parameters: CompanySnapshotSchema,
      async execute(_toolCallId, params: Static<typeof CompanySnapshotSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getCompanySnapshot(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Integration", "GetAdministrationData", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_month_end_checklist",
      description: "Generate a month-end closing checklist with compliance status for GL reconciliation, VAT filing, backoffice issues, and workflow completion.",
      parameters: MonthEndChecklistSchema,
      async execute(_toolCallId, params: Static<typeof MonthEndChecklistSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().generateMonthEndChecklist(params.administrationId, params.period)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Integration", "GenerateMonthEndChecklist", error)) }]
          };
        }
      }
    }
  ];
}
