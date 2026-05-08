import { describe, it, expect, beforeEach, vi } from "vitest";
import { ContactService } from "../../src/yuki/services/contacts.js";
import { ProjectsService } from "../../src/yuki/services/projects.js";
import { ArchiveService } from "../../src/yuki/services/archive.js";
import type { YukiSoapClient } from "../../src/yuki/soap.js";
import type { YukiSessionManager } from "../../src/yuki/auth.js";
import {
  validateContentType,
  validateFilename,
  validateFileSize,
  validateFileForUpload,
  detectContentTypeFromFilename
} from "../../src/utils/fileValidator.js";

// Mock SOAP responses
const mockSoapClient: Partial<YukiSoapClient> = {
  call: vi.fn()
};

const mockSessionManager: Partial<YukiSessionManager> = {
  getSessionId: vi.fn().mockResolvedValue("test-session-id-12345")
};

describe("Contact Service", () => {
  let contactService: ContactService;

  beforeEach(() => {
    vi.clearAllMocks();
    contactService = new ContactService(
      mockSoapClient as YukiSoapClient,
      mockSessionManager as YukiSessionManager
    );
  });

  describe("searchContacts", () => {
    it("should return empty array when no contacts found", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      const result = await contactService.searchContacts("nonexistent@example.com");

      expect(result).toEqual([]);
      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Contact",
        method: "SearchContacts",
        args: {
          sessionID: "test-session-id-12345",
          searchValue: "nonexistent@example.com"
        }
      });
    });

    it("should return single contact as array", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Contact: {
          ContactID: "cust123",
          ContactName: "ACME Corp",
          Email: "contact@acme.com"
        }
      });

      const result = await contactService.searchContacts("ACME");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        contactId: "cust123",
        name: "ACME Corp",
        email: "contact@acme.com",
        rawData: expect.any(Object)
      });
    });

    it("should return multiple contacts as array", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Contacts: {
          Contact: [
            { ContactID: "cust1", ContactName: "Company A", Email: "a@example.com" },
            { ContactID: "cust2", ContactName: "Company B", Email: "b@example.com" }
          ]
        }
      });

      const result = await contactService.searchContacts("Company");

      expect(result).toHaveLength(2);
      expect(result[0].contactId).toBe("cust1");
      expect(result[1].contactId).toBe("cust2");
    });

    it("should handle missing contact fields gracefully", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Contact: { ContactID: "cust99" }
      });

      const result = await contactService.searchContacts("Partial");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        contactId: "cust99",
        name: undefined,
        email: undefined,
        rawData: expect.any(Object)
      });
    });
  });

  describe("getSuppliersAndCustomers", () => {
    it("should return supplier and customer records", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Contacts: {
          Contact: [
            { ContactID: "supp1", ContactName: "Supplier Inc", ContactType: "Supplier" },
            { ContactID: "cust1", ContactName: "Customer LLC", ContactType: "Customer" }
          ]
        }
      });

      const result = await contactService.getSuppliersAndCustomers("Inc");

      expect(result).toHaveLength(2);
      expect(result[0].contactType).toBe("Supplier");
      expect(result[1].contactType).toBe("Customer");
    });

    it("should call GetSuppliersAndCustomers method", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      await contactService.getSuppliersAndCustomers("test");

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Contact",
        method: "GetSuppliersAndCustomers",
        args: {
          sessionID: "test-session-id-12345",
          searchValue: "test"
        }
      });
    });
  });

  describe("updateContact", () => {
    it("should update contact with dryRun=true by default", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Success: true,
        ValidationErrors: []
      });

      const xml = '<Contact><ContactID>cust1</ContactID></Contact>';
      const result = await contactService.updateContact(xml);

      expect(result.success).toBe(false); // dryRun=true means success is false
      expect(mockSoapClient.call).toHaveBeenCalled();
    });

    it("should update contact with dryRun=false", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ContactID: "cust1",
        ValidationErrors: []
      });

      const xml = '<Contact><ContactID>cust1</ContactID></Contact>';
      const result = await contactService.updateContact(xml, false);

      expect(result.success).toBe(true);
      expect(result.contactId).toBe("cust1");
    });

    it("should return validation errors", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ValidationErrors: ["Email is invalid", "Phone format incorrect"]
      });

      const xml = '<Contact><ContactID>cust1</ContactID></Contact>';
      const result = await contactService.updateContact(xml, false);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain("Email is invalid");
      expect(result.validationErrors).toContain("Phone format incorrect");
    });

    it("should capture warnings from update", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ContactID: "cust1",
        ValidationErrors: [],
        Warnings: ["Address incomplete", "Phone number format unusual"]
      });

      const xml = '<Contact><ContactID>cust1</ContactID></Contact>';
      const result = await contactService.updateContact(xml, false);

      expect(result.warnings).toContain("Address incomplete");
      expect(result.warnings).toContain("Phone number format unusual");
    });

    it("should handle SOAP errors gracefully", async () => {
      vi.mocked(mockSoapClient.call).mockRejectedValueOnce(new Error("Connection timeout"));

      const xml = '<Contact><ContactID>cust1</ContactID></Contact>';
      const result = await contactService.updateContact(xml, false);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain("Connection timeout");
    });
  });
});

describe("Projects Service", () => {
  let projectsService: ProjectsService;

  beforeEach(() => {
    vi.clearAllMocks();
    projectsService = new ProjectsService(
      mockSoapClient as YukiSoapClient,
      mockSessionManager as YukiSessionManager
    );
  });

  describe("listProjects", () => {
    it("should return projects for administration", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Projects: {
          Project: [
            { ProjectID: "proj1", ProjectCode: "P001", Description: "Website Redesign", Status: "Active" },
            { ProjectID: "proj2", ProjectCode: "P002", Description: "Mobile App", Status: "Planning" }
          ]
        }
      });

      const result = await projectsService.listProjects(456);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("proj1");
      expect(result[0].code).toBe("P001");
      expect(result[1].id).toBe("proj2");
    });

    it("should return empty array when no projects", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      const result = await projectsService.listProjects(456);

      expect(result).toEqual([]);
    });

    it("should pass administrationId correctly", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      await projectsService.listProjects(789);

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Projects",
        method: "ListProjects",
        args: {
          sessionID: "test-session-id-12345",
          administrationID: 789
        }
      });
    });
  });

  describe("getProject", () => {
    it("should retrieve project details", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ProjectID: "proj1",
        ProjectCode: "P001",
        Description: "Website Redesign",
        Status: "Active",
        Budget: 50000,
        Spent: 25000
      });

      const result = await projectsService.getProject("proj1");

      expect(result.projectId).toBe("proj1");
      expect(result.projectCode).toBe("P001");
      expect(result.description).toBe("Website Redesign");
      expect(result.status).toBe("Active");
      expect(result.budget).toBe(50000);
      expect(result.spent).toBe(25000);
    });

    it("should handle missing optional fields", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ProjectID: "proj1"
      });

      const result = await projectsService.getProject("proj1");

      expect(result.projectId).toBe("proj1");
      expect(result.projectCode).toBeUndefined();
      expect(result.budget).toBe(0);
      expect(result.spent).toBe(0);
    });

    it("should handle alternative field names", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ProjectID: "proj1",
        Code: "ALT_CODE",
        BudgetAmount: 30000,
        AmountSpent: 10000
      });

      const result = await projectsService.getProject("proj1");

      expect(result.projectCode).toBe("ALT_CODE");
      expect(result.budget).toBe(30000);
      expect(result.spent).toBe(10000);
    });
  });

  describe("updateProject", () => {
    it("should update project with dryRun=true by default", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ProjectID: "proj1",
        ValidationErrors: []
      });

      const xml = '<Project><ProjectID>proj1</ProjectID></Project>';
      const result = await projectsService.updateProject(xml);

      expect(result.success).toBe(false); // dryRun=true means success is false
      expect(result.projectId).toBe("proj1");
    });

    it("should update project with dryRun=false", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ProjectID: "proj1",
        ValidationErrors: []
      });

      const xml = '<Project><ProjectID>proj1</ProjectID></Project>';
      const result = await projectsService.updateProject(xml, false);

      expect(result.success).toBe(true);
      expect(result.projectId).toBe("proj1");
    });

    it("should return validation errors", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ValidationErrors: ["Budget cannot be negative", "End date before start date"]
      });

      const xml = '<Project><ProjectID>proj1</ProjectID></Project>';
      const result = await projectsService.updateProject(xml, false);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain("Budget cannot be negative");
      expect(result.validationErrors).toContain("End date before start date");
    });
  });
});

describe("Archive Service", () => {
  let archiveService: ArchiveService;

  beforeEach(() => {
    vi.clearAllMocks();
    archiveService = new ArchiveService(
      mockSoapClient as YukiSoapClient,
      mockSessionManager as YukiSessionManager
    );
  });

  describe("searchDocuments", () => {
    it("should search documents with basic parameters", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        Documents: {
          Document: [
            { DocumentID: "doc1", Filename: "invoice.pdf", UploadDate: "2024-01-15" },
            { DocumentID: "doc2", Filename: "receipt.pdf", Date: "2024-01-14" }
          ]
        }
      });

      const result = await archiveService.searchDocuments("invoice");

      expect(result).toHaveLength(2);
      expect(result[0].documentId).toBe("doc1");
      expect(result[0].filename).toBe("invoice.pdf");
    });

    it("should search with optional date range", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      await archiveService.searchDocuments(
        "report",
        "Invoices",
        "2024-01-01",
        "2024-01-31"
      );

      expect(mockSoapClient.call).toHaveBeenCalledWith({
        service: "Archive",
        method: "SearchDocuments",
        args: {
          sessionID: "test-session-id-12345",
          searchValue: "report",
          folder: "Invoices",
          dateFrom: "2024-01-01",
          dateTo: "2024-01-31"
        }
      });
    });

    it("should return empty array when no documents found", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({});

      const result = await archiveService.searchDocuments("nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("findDocument", () => {
    it("should retrieve document metadata", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        DocumentID: "doc1",
        Filename: "invoice_2024_01.pdf",
        ContentType: "application/pdf",
        FileSize: 102400,
        UploadDate: "2024-01-15",
        Description: "January 2024 Invoice"
      });

      const result = await archiveService.findDocument("doc1");

      expect(result.documentId).toBe("doc1");
      expect(result.filename).toBe("invoice_2024_01.pdf");
      expect(result.contentType).toBe("application/pdf");
      expect(result.fileSize).toBe(102400);
      expect(result.uploadDate).toBe("2024-01-15");
      expect(result.description).toBe("January 2024 Invoice");
    });

    it("should handle alternative field names", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        DocumentID: "doc1",
        MimeType: "text/plain",
        Size: 5120,
        Date: "2024-01-10"
      });

      const result = await archiveService.findDocument("doc1");

      expect(result.contentType).toBe("text/plain");
      expect(result.fileSize).toBe(5120);
      expect(result.uploadDate).toBe("2024-01-10");
    });
  });

  describe("downloadDocument", () => {
    it("should download document with metadata", async () => {
      vi.mocked(mockSoapClient.call)
        .mockResolvedValueOnce({
          DocumentID: "doc1",
          Filename: "report.pdf",
          ContentType: "application/pdf"
        })
        .mockResolvedValueOnce("JVBERi0xLjQKJeLjz9MNCjEgMCBvYmo="); // Base64 encoded PDF snippet

      const result = await archiveService.downloadDocument("doc1");

      expect(result.documentId).toBe("doc1");
      expect(result.contentType).toBe("application/pdf");
      expect(result.filename).toBe("report.pdf");
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe("uploadDocument", () => {
    it("should upload document with dryRun=true by default", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        DocumentID: "doc_new",
        ValidationErrors: []
      });

      const fileData = "SGVsbG8gV29ybGQ="; // Base64 "Hello World"
      const result = await archiveService.uploadDocument(
        { folder: "Invoices" },
        fileData,
        "test.txt"
      );

      expect(result.success).toBe(false); // dryRun=true means success is false
      expect(result.documentId).toBe("doc_new");
    });

    it("should upload document with dryRun=false", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        DocumentID: "doc_new",
        ValidationErrors: []
      });

      const fileData = "SGVsbG8gV29ybGQ="; // Base64 "Hello World"
      const result = await archiveService.uploadDocument(
        { folder: "Invoices" },
        fileData,
        "test.txt",
        false
      );

      expect(result.success).toBe(true);
      expect(result.documentId).toBe("doc_new");
    });

    it("should return upload validation errors", async () => {
      vi.mocked(mockSoapClient.call).mockResolvedValueOnce({
        ValidationErrors: ["File virus scan failed", "Duplicate filename in folder"]
      });

      const fileData = "SGVsbG8gV29ybGQ=";
      const result = await archiveService.uploadDocument(
        { folder: "Invoices" },
        fileData,
        "test.txt",
        false
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain("File virus scan failed");
      expect(result.validationErrors).toContain("Duplicate filename in folder");
    });

    it("should handle upload SOAP errors gracefully", async () => {
      vi.mocked(mockSoapClient.call).mockRejectedValueOnce(
        new Error("Archive service unavailable")
      );

      const fileData = "SGVsbG8gV29ybGQ=";
      const result = await archiveService.uploadDocument(
        { folder: "Invoices" },
        fileData,
        "test.txt",
        false
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain("Archive service unavailable");
    });
  });
});

describe("File Validator", () => {
  describe("validateContentType", () => {
    it("should allow PDF content-type", () => {
      const result = validateContentType("application/pdf");
      expect(result.valid).toBe(true);
      expect(result.contentType).toBe("application/pdf");
    });

    it("should allow Office document types", () => {
      const result1 = validateContentType("application/msword");
      const result2 = validateContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });

    it("should reject executable content-types", () => {
      const result = validateContentType("application/x-executable");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject missing content-type", () => {
      const result = validateContentType("");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Content-Type is required");
    });

    it("should strip charset and process base MIME type", () => {
      const result = validateContentType("application/pdf; charset=utf-8");
      expect(result.valid).toBe(true);
      expect(result.contentType).toBe("application/pdf");
    });
  });

  describe("validateFilename", () => {
    it("should allow simple filenames", () => {
      const result = validateFilename("invoice.pdf");
      expect(result.valid).toBe(true);
    });

    it("should reject path traversal attempts", () => {
      const result1 = validateFilename("../../../etc/passwd");
      const result2 = validateFilename("..\\windows\\system32");
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
      expect(result1.errors).toContain("Filename contains invalid path characters");
    });

    it("should reject executable extensions", () => {
      const result = validateFilename("malware.exe");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File extension '.exe' is not allowed");
    });

    it("should reject filenames over 255 characters", () => {
      const longName = "a".repeat(256) + ".pdf";
      const result = validateFilename(longName);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Filename exceeds 255 characters");
    });

    it("should warn about extension mismatch", () => {
      const result = validateFilename("document.pdf", "application/msword");
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("validateFileSize", () => {
    it("should allow reasonable file sizes", () => {
      const result = validateFileSize(1024 * 100); // 100KB
      expect(result.valid).toBe(true);
    });

    it("should reject oversized files", () => {
      const result = validateFileSize(200 * 1024 * 1024); // 200MB, exceeds default 100MB
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should respect custom max size", () => {
      const result = validateFileSize(150 * 1024 * 1024, 100); // 150MB > 100MB max
      expect(result.valid).toBe(false);
    });

    it("should warn about large files", () => {
      const result = validateFileSize(60 * 1024 * 1024); // 60MB
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should warn about zero-byte files", () => {
      const result = validateFileSize(0);
      expect(result.warnings).toContain("File size is 0 bytes; empty file detected");
    });
  });

  describe("validateFileForUpload", () => {
    it("should validate complete upload parameters", () => {
      const result = validateFileForUpload("report.pdf", "application/pdf", 512000);
      expect(result.valid).toBe(true);
    });

    it("should collect all validation errors", () => {
      const result = validateFileForUpload("../evil.exe", "application/x-executable", 300 * 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("detectContentTypeFromFilename", () => {
    it("should detect PDF content-type", () => {
      const result = detectContentTypeFromFilename("document.pdf");
      expect(result).toBe("application/pdf");
    });

    it("should detect image content-types", () => {
      expect(detectContentTypeFromFilename("photo.jpg")).toBe("image/jpeg");
      expect(detectContentTypeFromFilename("diagram.png")).toBe("image/png");
    });

    it("should return undefined for unknown extensions", () => {
      const result = detectContentTypeFromFilename("archive.xyz");
      expect(result).toBeUndefined();
    });

    it("should handle uppercase extensions", () => {
      const result = detectContentTypeFromFilename("REPORT.PDF");
      expect(result).toBe("application/pdf");
    });
  });
});
