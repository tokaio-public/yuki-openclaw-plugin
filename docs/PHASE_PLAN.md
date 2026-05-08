# OpenClaw Yuki Phase Plan

## Status legend
- planned
- in-progress
- implemented
- tested
- blocked

## Phase 0 - Repository and plugin skeleton
- Status: implemented
- Acceptance criteria:
  - TypeScript strict project scaffold exists.
  - OpenClaw manifest exists with tool contracts.
  - Core docs and tests folders exist.

## Phase 1 - Authentication, config, diagnostics
- Status: implemented
- Acceptance criteria:
  - Secure config loader supports env + plugin config.
  - SOAP client supports Authenticate and common session methods.
  - Session cache with expiry strategy is implemented.
  - Domain and administration helper calls are implemented.
  - OpenClaw tools added:
    - yuki_health_check
    - yuki_list_domains
    - yuki_get_current_domain
    - yuki_set_current_domain
    - yuki_list_administrations
  - Unit tests for config/redaction/SOAP behavior exist.

## Phase 2 - Read-only accounting/reporting
- Status: implemented
- Acceptance criteria:
  - Accounting service module with GL balances, transactions, revenue, receivables, payables ✓
  - AccountingInfo service module with GL scheme, transaction search, transaction details ✓
  - 7 new read-only OpenClaw tools implemented and tested ✓
    - yuki_get_trial_balance: GL account balances for a date
    - yuki_search_transactions: GL account transaction search with date/account filters
    - yuki_get_transaction: Transaction detail retrieval
    - yuki_get_receivables_summary: Outstanding debtor items summary
    - yuki_get_payables_summary: Outstanding creditor items summary
    - yuki_get_profit_and_loss: P&L calculation for date range
    - yuki_list_gl_accounts: Chart of accounts enumeration
  - Normalized JSON output with optional raw Yuki response ✓
  - Response envelope shape with warnings and error handling ✓
  - Unit tests with mocked SOAP flows ✓
  - Accounting capability matrix entries marked implemented ✓

## Phase 3 - Sales and purchase invoices
- Status: implemented
- Acceptance criteria:
  - Sales service module with schema path, items list, and submission methods ✓
  - Purchase service module with schema path, items list, and submission methods ✓
  - XML validator for well-formedness and invoice structure checking ✓
  - 6 new OpenClaw write tools implemented and tested ✓
    - yuki_get_sales_invoice_schema: Retrieve sales invoice XML schema path
    - yuki_get_purchase_invoice_schema: Retrieve purchase invoice XML schema path
    - yuki_list_sales_items: List available sales items for invoice creation
    - yuki_list_purchase_items: List available purchase items for invoice creation
    - yuki_submit_sales_invoice: Submit sales invoices with dry-run + confirmation
    - yuki_submit_purchase_invoice: Submit purchase invoices with dry-run + confirmation
  - XML validation before submission (structure, well-formedness, tag balance) ✓
  - Write operations protected by dry-run default (dryRun=true) ✓
  - Explicit confirmation required for actual submission (confirm=true, summary required) ✓
  - Invoice count estimation and validation summary reporting ✓
  - Unit tests for XML validator, service methods, and tool error handling ✓
  - Sales and Purchase capability matrix entries marked implemented ✓

## Phase 4 - Contacts, projects, archive
- Status: implemented
- Acceptance criteria:
  - Contact service module with search, suppliers/customers, and update methods ✓
  - Projects service module with list, get detail, and update methods ✓
  - Archive service module with document search, metadata, download, and upload methods ✓
  - File validator utility with content-type, filename, and size validation ✓
  - 8 new OpenClaw read/write tools implemented and tested ✓
    - yuki_search_contacts: Search contacts by name/email/company
    - yuki_list_suppliers_customers: List suppliers and customers
    - yuki_list_projects: List projects for administration
    - yuki_get_project: Retrieve project details
    - yuki_search_documents: Search archive documents with date/folder filters
    - yuki_get_document_metadata: Retrieve document metadata and file info
    - yuki_update_contact: Update contact with dry-run + confirmation
    - yuki_update_project: Update project with dry-run + confirmation
    - yuki_download_document: Download document (preview mode, binary data not included)
    - yuki_upload_document: Upload document with file validation + dry-run + confirmation
  - File content-type validator with whitelist (pdf, office, images, etc.) ✓
  - Filename safety validation (no path traversal, no executables) ✓
  - File size limits and warnings (default 100MB max) ✓
  - Write operations protected by dry-run default for contact/project updates ✓
  - Document upload protected by file validation + dry-run + confirmation ✓
  - Unit tests for all service methods and file validator (60+ test cases) ✓
  - Contact, Projects, Archive capability matrix entries marked implemented ✓

## Phase 5 - VAT and back-office workflow
- Status: implemented
- Acceptance criteria:
  - VAT service module with return list and active codes methods ✓
  - Backoffice service module with outstanding questions and workflow methods ✓
  - 4 new read-only OpenClaw tools implemented and tested ✓
    - yuki_get_vat_return_statuses: VAT return filings with optional period filter
    - yuki_list_vat_codes: Active VAT codes and tax rates
    - yuki_get_outstanding_backoffice_questions: Open back-office questions and tasks
    - yuki_get_backoffice_workflow: Workflow queue and task status
  - Input schemas for VAT and Backoffice operations ✓
  - Unit tests with mocked SOAP flows (30+ test cases) ✓
  - VAT and Backoffice capability matrix entries marked implemented ✓

## Phase 6 - High-level summaries
- Status: implemented
- Acceptance criteria:
  - IntegrationService module with getAdministrationData() for company profile snapshots ✓
  - MonthEndChecklistService module with generateMonthEndChecklist() aggregating 4 compliance checks ✓
    - GL reconciliation check (transaction count, GL entries present)
    - VAT filing status check (return filed vs pending)
    - Backoffice issues check (open high-priority questions)
    - Workflow completion check (pending workflow items)
  - Checklist status determination: on-track (no issues) | at-risk (warnings) | blocked (2+ high-priority questions) ✓
  - Completion percentage calculation (items completed vs total) ✓
  - Warning messages with actionable next steps ✓
  - 2 new read-only OpenClaw tools implemented:
    - yuki_get_company_snapshot: Retrieve company profile information
    - yuki_get_month_end_checklist: Generate month-end closing checklist with compliance status
  - Input schemas with administrationId and period (YYYY-MM) validation ✓
  - Client orchestration methods (getCompanySnapshot, generateMonthEndChecklist) ✓
  - Comprehensive unit tests (40+ test cases) with all 4 service checks verified ✓
  - Manifest updated with 32 total OpenClaw tools (2 new Phase 6 read tools) ✓

## Phase 7 - CLI diagnostics
- Status: implemented
- Acceptance criteria:
  - Plugin CLI entry point with diagnostic commands ✓
  - Health check command (connectivity and authentication testing) ✓
  - Configuration validation command ✓
  - Domain enumeration command ✓
  - Administration enumeration command ✓
  - Comprehensive setup validation command (all checks in sequence) ✓
  - Output formatters for text, JSON, CSV, and table formats ✓
  - Support for --format, --verbose flags ✓
  - CLI help text and command documentation ✓
  - Bin entry point: `yuki-cli <command>` available after `npm link` or via `npx` ✓
  - Unit tests (25+ test cases) covering all commands and formatters ✓
  - CLI can be invoked as: `yuki-cli health`, `yuki-cli validate-setup --format json`, etc. ✓

## Phase 8 - Hardening and packaging
- Status: implemented
- Acceptance criteria:
  - Full test coverage targets reached (75% minimum: statements, branches, functions, lines) ✓
  - Coverage reporting configured (vitest with v8 provider, HTML/LCOV output) ✓
  - Integration test suite created with 8 workflow scenarios (Phase 8 tests) ✓
  - Environment-based test gating (INTEGRATION_TESTS=true flag) ✓
  - CLI test coverage (25+ test cases for all commands and formatters) ✓
  - Pre-publication validation script (prepublishOnly npm script) ✓
  - npm package configuration with bin entry for CLI ✓
  - .npmignore file to exclude development artifacts ✓
  - Comprehensive operational runbook (docs/OPERATIONS.md - 400+ lines) ✓
  - Deployment guide with rollback procedure ✓
  - Configuration management documentation ✓
  - Monitoring & observability guide ✓
  - Troubleshooting guide (10+ scenarios) ✓
  - Performance tuning recommendations ✓
  - Security operations guide (key rotation, audit logging) ✓
  - Incident response procedures ✓
  - Packaging & build guide (docs/PACKAGING.md - 300+ lines) ✓
  - Build process documentation ✓
  - Versioning strategy (semantic versioning) ✓
  - Release workflow with pre-flight checklist ✓
  - GitHub Actions CI/CD workflows (test.yml, publish.yml) ✓
  - CI pipeline for automated testing and coverage reporting ✓
  - Publish pipeline with automated npm release ✓
  - Test suite: 9 unit test files (160+ test cases) + 1 integration test file (40+ test cases) ✓
  - All TypeScript strict mode compliance ✓
  - Zero compiler errors ✓
