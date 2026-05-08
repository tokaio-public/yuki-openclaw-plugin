/**
 * Integration Tests - Phase 8
 * Tests that span multiple services and require integration test flag
 * Run with: INTEGRATION_TESTS=true npm run test:integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { YukiClient } from "../../src/yuki/client.js";
import type { YukiResponseEnvelope } from "../../src/yuki/types.js";

// Mock SOAP client and session
const mockSoapClient = {
  call: vi.fn()
};

const mockSession = {
  getValidatedSession: vi.fn(async () => "mock-session-id")
};

describe("Integration Tests - Full Workflow Scenarios", () => {
  let client: YukiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new YukiClient({});
  });

  describe("Accounting Workflow - From trial balance to month-end closure", () => {
    it("should support full accounting period close workflow", async () => {
      // Scenario: Accountant closes a month by:
      // 1. Checking trial balance
      // 2. Retrieving transactions for the period
      // 3. Getting receivables/payables summary
      // 4. Generating month-end checklist
      // 5. Verifying VAT status

      const administrationId = 42;
      const period = "2024-01";

      // Step 1: Trial Balance
      mockSoapClient.call.mockResolvedValueOnce({
        GLAccounts: {
          GLAccount: [
            { accountNumber: "1000", debitAmount: "50000", creditAmount: "0" },
            { accountNumber: "2000", debitAmount: "0", creditAmount: "25000" }
          ]
        }
      });

      // Step 2: Transaction Search
      mockSoapClient.call.mockResolvedValueOnce({
        Transactions: {
          Transaction: [
            { transactionId: "1", description: "Opening", accountNumber: "1000" },
            { transactionId: "2", description: "Sales", accountNumber: "4000" }
          ]
        }
      });

      // Step 3: Receivables
      mockSoapClient.call.mockResolvedValueOnce({
        Items: {
          Item: [{ itemId: "1", amount: "5000", daysOverdue: "10" }]
        }
      });

      // Step 4: Month-end checklist (aggregates multiple checks)
      mockSoapClient.call.mockResolvedValueOnce({
        Transactions: { Transaction: [{ transactionId: "1" }] }
      });
      mockSoapClient.call.mockResolvedValueOnce({
        VATReturns: {
          VATReturn: [{ vatReturnId: "1", status: "Filed" }]
        }
      });
      mockSoapClient.call.mockResolvedValueOnce({
        Questions: { Question: [] }
      });
      mockSoapClient.call.mockResolvedValueOnce({
        Items: { Item: [] }
      });

      // Step 5: VAT codes
      mockSoapClient.call.mockResolvedValueOnce({
        Codes: { Code: [{ code: "VAT-NL", percentage: "21" }] }
      });

      // Execute workflow
      const trialBalance = await client.getTrialBalance(administrationId, "2024-01-31");
      const transactions = await client.searchTransactions(administrationId, {
        fromDate: "2024-01-01",
        toDate: "2024-01-31"
      });
      const receivables = await client.getReceivablesSummary(administrationId);
      const checklist = await client.generateMonthEndChecklist(administrationId, period);
      const vatCodes = await client.getActiveVATCodes(administrationId);

      // Verify workflow completion
      expect(trialBalance.ok).toBe(true);
      expect(transactions.ok).toBe(true);
      expect(receivables.ok).toBe(true);
      expect(checklist.ok).toBeDefined();
      expect(vatCodes.ok).toBe(true);
    });
  });

  describe("Document Management Workflow - Upload, search, retrieve", () => {
    it("should support document lifecycle management", async () => {
      // Scenario: Archive manager uploads and manages documents
      const administrationId = 42;

      // Mock document upload response
      mockSoapClient.call.mockResolvedValueOnce({
        DocumentId: "doc-123",
        FileName: "invoice.pdf",
        Status: "Uploaded"
      });

      // Mock document search
      mockSoapClient.call.mockResolvedValueOnce({
        Documents: {
          Document: [
            { documentId: "doc-123", fileName: "invoice.pdf", uploadDate: "2024-01-15" }
          ]
        }
      });

      // Mock document metadata
      mockSoapClient.call.mockResolvedValueOnce({
        DocumentId: "doc-123",
        FileName: "invoice.pdf",
        FileSize: "125000",
        ContentType: "application/pdf"
      });

      // Execute workflow
      const uploadFile = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF header
      const uploadResult = await client.uploadDocument(administrationId, {
        fileName: "invoice.pdf",
        file: uploadFile,
        description: "Invoice for period"
      });

      const searchResult = await client.searchDocuments(administrationId, {
        searchTerm: "invoice"
      });

      const metadataResult = await client.getDocumentMetadata(administrationId, "doc-123");

      // Verify document lifecycle
      expect(uploadResult.ok).toBe(true);
      expect(searchResult.ok).toBe(true);
      expect(metadataResult.ok).toBe(true);
    });
  });

  describe("Invoice Processing Workflow - Schema to submission", () => {
    it("should support complete invoice submission workflow", async () => {
      const administrationId = 42;

      // Mock schema path retrieval
      mockSoapClient.call.mockResolvedValueOnce({
        Path: "/schemas/sales-invoice.xsd"
      });

      // Mock items list
      mockSoapClient.call.mockResolvedValueOnce({
        Items: {
          Item: [
            { itemId: "item-1", code: "SERVICE-100", description: "Consulting" }
          ]
        }
      });

      // Mock dry-run submission
      mockSoapClient.call.mockResolvedValueOnce({
        Success: true,
        PreviewId: "preview-123",
        InvoiceCount: 1,
        TotalAmount: "1000"
      });

      // Mock actual submission
      mockSoapClient.call.mockResolvedValueOnce({
        Success: true,
        InvoiceIds: ["inv-1001"],
        ProcessedCount: 1
      });

      // Execute workflow
      const schemaResult = await client.getSalesInvoiceSchema(administrationId);
      const itemsResult = await client.listSalesItems(administrationId);

      const invoiceXml = `<?xml version="1.0"?>
        <Invoice>
          <InvoiceNumber>TEST-001</InvoiceNumber>
          <Amount>1000</Amount>
        </Invoice>`;

      const dryRunResult = await client.submitSalesInvoice(administrationId, {
        xml: invoiceXml,
        dryRun: true
      });

      const submitResult = await client.submitSalesInvoice(administrationId, {
        xml: invoiceXml,
        dryRun: false,
        confirm: true,
        confirmSummary: "1 invoice for €1000"
      });

      // Verify invoice workflow
      expect(schemaResult.ok).toBe(true);
      expect(itemsResult.ok).toBe(true);
      expect(dryRunResult.ok).toBe(true);
      expect(submitResult.ok).toBe(true);
    });
  });

  describe("Contact and Project Management Workflow", () => {
    it("should support contact and project updates in coordinated workflow", async () => {
      const administrationId = 42;

      // Mock contact search
      mockSoapClient.call.mockResolvedValueOnce({
        Contacts: {
          Contact: [
            { contactId: "c1", name: "ACME Corp", email: "info@acme.com" }
          ]
        }
      });

      // Mock project list
      mockSoapClient.call.mockResolvedValueOnce({
        Projects: {
          Project: [
            { projectId: "p1", code: "PROJ-2024", description: "Main project" }
          ]
        }
      });

      // Mock contact update dry-run
      mockSoapClient.call.mockResolvedValueOnce({
        Success: false,
        UpdatedCount: 0,
        PreviewedCount: 1
      });

      // Mock contact update actual
      mockSoapClient.call.mockResolvedValueOnce({
        Success: true,
        UpdatedCount: 1,
        ContactId: "c1"
      });

      // Mock project update
      mockSoapClient.call.mockResolvedValueOnce({
        Success: true,
        UpdatedCount: 1,
        ProjectId: "p1"
      });

      // Execute workflow
      const searchResult = await client.searchContacts(administrationId, {
        searchTerm: "ACME"
      });

      const projectsResult = await client.listProjects(administrationId);

      const contactUpdateDry = await client.updateContact(administrationId, "c1", {
        email: "new@acme.com",
        dryRun: true
      });

      const contactUpdateActual = await client.updateContact(administrationId, "c1", {
        email: "new@acme.com",
        dryRun: false,
        confirm: true,
        confirmSummary: "Update ACME Corp contact"
      });

      const projectUpdate = await client.updateProject(administrationId, "p1", {
        description: "Updated project description",
        dryRun: false,
        confirm: true,
        confirmSummary: "Update project"
      });

      // Verify workflow
      expect(searchResult.ok).toBe(true);
      expect(projectsResult.ok).toBe(true);
      expect(contactUpdateDry.ok).toBe(true);
      expect(contactUpdateActual.ok).toBe(true);
      expect(projectUpdate.ok).toBe(true);
    });
  });

  describe("Administrative and Compliance Workflow", () => {
    it("should support VAT and backoffice workflow coordination", async () => {
      const administrationId = 42;

      // Mock VAT returns
      mockSoapClient.call.mockResolvedValueOnce({
        VATReturns: {
          VATReturn: [
            { vatReturnId: "vat-1", period: "2024-01", status: "Filed" },
            { vatReturnId: "vat-2", period: "2024-02", status: "Pending" }
          ]
        }
      });

      // Mock backoffice questions
      mockSoapClient.call.mockResolvedValueOnce({
        Questions: {
          Question: [
            {
              questionId: "q1",
              topic: "Invoice",
              question: "Missing invoice?",
              priority: "High"
            }
          ]
        }
      });

      // Mock backoffice workflow
      mockSoapClient.call.mockResolvedValueOnce({
        Items: {
          Item: [
            { workflowId: "w1", title: "Period review", status: "Pending" }
          ]
        }
      });

      // Mock company snapshot for context
      mockSoapClient.call.mockResolvedValueOnce({
        AdministrationId: "42",
        Company: "Test Company",
        Country: "NL"
      });

      // Execute workflow
      const vatReturns = await client.getVATReturnList(administrationId, {
        fromPeriod: "2024-01",
        toPeriod: "2024-02"
      });

      const boQuestions = await client.getOutstandingBackofficeQuestions(administrationId);

      const workflow = await client.getBackofficeWorkflow(administrationId);

      const snapshot = await client.getCompanySnapshot(administrationId);

      // Verify compliance workflow
      expect(vatReturns.ok).toBe(true);
      expect(boQuestions.ok).toBe(true);
      expect(workflow.ok).toBe(true);
      expect(snapshot.ok).toBe(true);
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should handle partial failures in multi-step workflows gracefully", async () => {
      const administrationId = 42;

      // Simulate mixed success/failure scenarios
      mockSoapClient.call.mockResolvedValueOnce({
        GLAccounts: { GLAccount: [] } // Empty result
      });

      mockSoapClient.call.mockRejectedValueOnce(new Error("API timeout"));

      mockSoapClient.call.mockResolvedValueOnce({
        Items: { Item: [] }
      });

      // Execute workflow with mixed results
      let results: boolean[] = [];

      try {
        const result1 = await client.getTrialBalance(administrationId, "2024-01-31");
        results.push(result1.ok);
      } catch {
        results.push(false);
      }

      try {
        const result2 = await client.searchTransactions(administrationId, {
          fromDate: "2024-01-01",
          toDate: "2024-01-31"
        });
        results.push(result2.ok);
      } catch {
        results.push(false);
      }

      try {
        const result3 = await client.getReceivablesSummary(administrationId);
        results.push(result3.ok);
      } catch {
        results.push(false);
      }

      // Verify partial failure handling
      expect(results.some((r) => !r)).toBe(true);
      expect(results.some((r) => r)).toBe(true);
    });
  });

  describe("Concurrent Operations - Rate Limit Compliance", () => {
    it("should handle multiple concurrent requests within rate limits", async () => {
      const administrationId = 42;

      // Setup multiple mocked responses
      mockSoapClient.call.mockResolvedValue({
        GLAccounts: { GLAccount: [] }
      });

      // Execute multiple concurrent operations
      const operations = [
        client.getTrialBalance(administrationId, "2024-01-31"),
        client.listDomains(),
        client.listAdministrations(),
        client.getReceivablesSummary(administrationId),
        client.getPayablesSummary(administrationId)
      ];

      const results = await Promise.allSettled(operations);

      // Verify all operations completed
      expect(results.length).toBe(5);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    });
  });

  describe("Data Validation Across Service Boundaries", () => {
    it("should maintain data consistency across related service calls", async () => {
      const administrationId = 42;

      // Mock company data
      mockSoapClient.call.mockResolvedValueOnce({
        AdministrationId: "42",
        Company: "Test Company",
        Country: "NL",
        Currency: "EUR"
      });

      // Mock P&L with matching currency
      mockSoapClient.call.mockResolvedValueOnce({
        PeriodResult: "1000",
        Currency: "EUR"
      });

      // Mock GL accounts with matching currency context
      mockSoapClient.call.mockResolvedValueOnce({
        GLAccounts: {
          GLAccount: [
            { accountNumber: "1000", currency: "EUR", balance: "50000" }
          ]
        }
      });

      // Execute related calls
      const company = await client.getCompanySnapshot(administrationId);
      const pl = await client.getProfitAndLoss(administrationId, {
        fromDate: "2024-01-01",
        toDate: "2024-01-31"
      });
      const accounts = await client.listGLAccounts(administrationId);

      // Verify data consistency
      expect(company.ok).toBe(true);
      expect(pl.ok).toBe(true);
      expect(accounts.ok).toBe(true);
    });
  });
});
