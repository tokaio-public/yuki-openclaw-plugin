# OpenClaw Yuki Plugin

Production-focused OpenClaw plugin that connects agents to Yuki SOAP webservices with a strict safety model.

Current implementation scope: Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, and Phase 6 (all phases completed).

## What it does

- Connects to Yuki SOAP services over HTTPS.
- Authenticates using a Yuki access key.
- Caches session IDs with expiry handling.
- Exposes 32 OpenClaw tools for diagnostics, domain management, accounting reports, invoice operations, contacts, projects, archive, VAT/backoffice workflow, and company snapshots:

**Phase 1 & 2 Tools (Read-Only):**
	- `yuki_health_check` — Validate connectivity
	- `yuki_list_domains` — List accessible domains
	- `yuki_get_current_domain` — Get active domain
	- `yuki_set_current_domain` — Set active domain
	- `yuki_list_administrations` — List administrations
	- `yuki_get_trial_balance` — GL account balances
	- `yuki_search_transactions` — Search GL transactions by date/account
	- `yuki_get_transaction` — Retrieve transaction details
	- `yuki_get_receivables_summary` — Outstanding receivables summary
	- `yuki_get_payables_summary` — Outstanding payables summary
	- `yuki_get_profit_and_loss` — P&L calculation for date range
	- `yuki_list_gl_accounts` — Chart of accounts enumeration

**Phase 3 Tools (Write-Protected):**
	- `yuki_get_sales_invoice_schema` — Retrieve sales invoice schema path
	- `yuki_get_purchase_invoice_schema` — Retrieve purchase invoice schema path
	- `yuki_list_sales_items` — List available sales items
	- `yuki_list_purchase_items` — List available purchase items
	- `yuki_submit_sales_invoice` — Submit sales invoices (dry-run + confirmation required)
	- `yuki_submit_purchase_invoice` — Submit purchase invoices (dry-run + confirmation required)

**Phase 4 Tools (Read + Write-Protected):**
	- `yuki_search_contacts` — Search contacts by name/email/company
	- `yuki_list_suppliers_customers` — List suppliers and customers
	- `yuki_list_projects` — List projects for administration
	- `yuki_get_project` — Retrieve project details
	- `yuki_search_documents` — Search archive documents with filters
	- `yuki_get_document_metadata` — Retrieve document metadata and file info
	- `yuki_update_contact` — Update contact (dry-run + confirmation)
	- `yuki_update_project` — Update project (dry-run + confirmation)
	- `yuki_download_document` — Download document from archive
	- `yuki_upload_document` — Upload document with validation (dry-run + confirmation)

**Phase 5 Tools (Read-Only):**
	- `yuki_get_vat_return_statuses` — VAT return filing status and due dates
	- `yuki_list_vat_codes` — Active VAT codes and tax rates
	- `yuki_get_outstanding_backoffice_questions` — Open back-office questions and tasks
	- `yuki_get_backoffice_workflow` — Workflow queue and task status

**Phase 6 Tools (Read-Only):**
	- `yuki_get_company_snapshot` — Company profile information and administration data
	- `yuki_get_month_end_checklist` — Month-end closing checklist with compliance status (GL reconciliation, VAT filing, backoffice issues, workflow completion)

## Yuki service model (confirmed)

Yuki uses SOAP/ASMX webservices with XML payloads and WSDL service descriptions, not a REST-first API surface.

Primary docs: https://documenter.getpostman.com/view/12207912/UVCBB51L

Live endpoints inspected include:

- https://api.yukiworks.be/ws/Accounting.asmx
- https://api.yukiworks.be/ws/AccountingInfo.asmx
- https://api.yukiworks.be/ws/Sales.asmx
- https://api.yukiworks.be/ws/Archive.asmx
- https://api.yukiworks.be/ws/Contact.asmx
- https://api.yukiworks.be/ws/Projects.asmx
- https://api.yukiworks.be/ws/Vat.asmx
- https://api.yukiworks.be/ws/Backoffice.asmx
- https://api.yukiworks.be/ws/Integration.asmx

## Requirements

- Node.js 22+
- OpenClaw CLI/Gateway (current docs recommend Node 24, Node 22 LTS compatible)
- A valid Yuki webservice access key with required service permissions

## Install (local development)

1. Install dependencies

```bash
npm install
```

2. Build plugin

```bash
npm run build
```

3. Install as linked local plugin

```bash
openclaw plugins install -l ./
```

4. Restart Gateway

```bash
openclaw gateway restart
```

5. Inspect runtime registrations

```bash
openclaw plugins inspect openclaw-yuki --runtime --json
```

## Configuration

Use `.env` and/or OpenClaw plugin config.

Required:

- `YUKI_ACCESS_KEY`

Optional:

- `YUKI_COUNTRY=be|nl`
- `YUKI_DEFAULT_DOMAIN_ID`
- `YUKI_DEFAULT_ADMINISTRATION_ID`
- `YUKI_REQUEST_TIMEOUT_MS`
- `YUKI_MAX_CALLS_PER_MINUTE`
- `YUKI_MAX_CALLS_PER_DAY`
- `YUKI_WRITE_OPERATIONS_ENABLED`
- `YUKI_DEFAULT_DRY_RUN`
- `YUKI_LOG_LEVEL`
- `YUKI_INCLUDE_RAW_RESPONSES`

See `docs/CONFIGURATION.md` for the complete reference.

## CLI Diagnostics

Phase 7 provides a standalone CLI tool for troubleshooting and setup validation.

### Installation

```bash
npm install -g @tokaio/openclaw-yuki
# or
npm link
```

### Commands

```bash
# Test connectivity and authentication
yuki-cli health

# Validate configuration setup
yuki-cli validate-config

# List accessible domains
yuki-cli list-domains

# List accessible administrations  
yuki-cli list-administrations

# Comprehensive setup validation (all checks)
yuki-cli validate-setup

# Show plugin version
yuki-cli version

# Display help
yuki-cli help
```

### Options

- `--verbose, -v` — Enable verbose output
- `--format <fmt>` — Output format: text, json, table, csv (default: text)

### Examples

```bash
# Setup validation with JSON output
yuki-cli validate-setup --format json

# List administrations as CSV
yuki-cli list-administrations --format csv

# Health check with verbose output
yuki-cli health --verbose

# Via npx (without installation)
npx @tokaio/openclaw-yuki health
```

All CLI commands respect the same configuration (`.env`, YUKI_* variables) as the plugin.

## Safety model

- Redaction-first logging.
- No secrets committed in source.
- Fail-closed config behavior.
- HTTPS endpoints only.
- Write operations disabled by default.
- Planned write tools require explicit confirmation and dry-run override.

See `docs/SECURITY.md` for details.

## Test

```bash
# Run unit tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run integration tests (requires INTEGRATION_TESTS flag)
npm run test:integration

# Run all tests including integration
npm run test:all

# Watch mode for development
npm run test:watch
```

### Test Coverage

- **Target**: 75% minimum coverage (statements, branches, functions, lines)
- **Provider**: Vitest with v8
- **Reports**: HTML, LCOV, JSON, and terminal output

### Test Suite

**Unit Tests** (9 test files, 160+ test cases):
- config loading and validation
- redaction behavior for sensitive data
- SOAP client flows (auth, domain, administration)
- Accounting service (GL balances, transactions, receivables, payables, P&L)
- AccountingInfo service (GL scheme, transaction search, details)
- XML validation (well-formedness, structure, encoding, counts)
- Invoice submission (dry-run, confirmation, validation summary)
- Contact management (search, update)
- Project management (search, update)
- Document archive (search, metadata, upload, download)
- CLI commands (health, validate-config, list-domains, etc.)
- CLI output formatters (text, json, csv, table)
- VAT and backoffice workflow
- Month-end checklist aggregation

**Integration Tests** (1 test file, 40+ test cases, Phase 8):
- Full accounting period close workflow
- Document lifecycle management
- Invoice processing workflow
- Contact and project management workflow
- Administrative and compliance workflow
- Error recovery and resilience
- Concurrent operations and rate limit compliance
- Data validation across service boundaries

### CI/CD Pipeline

GitHub Actions workflows for:
- **Test**: Runs on push to main/develop and PR creation
  - Tests on Node 22 LTS
  - Type checking
  - Coverage reporting
  - PR comments with coverage metrics
- **Publish**: Runs on release creation
  - Full test suite validation
  - Build verification
  - Automated npm publish
  - Release notes

## Documentation

Complete operational and development documentation:

- `docs/PHASE_PLAN.md` — Phase implementation status
- `docs/CLI.md` — CLI reference and examples
- `docs/CONFIGURATION.md` — Configuration reference
- `docs/OPERATIONS.md` — Operational runbook (Phase 8)
- `docs/PACKAGING.md` — Build and release procedures (Phase 8)
- `docs/SECURITY.md` — Security model and practices
- `docs/YUKI_API_CAPABILITY_MATRIX.md` — API capability mapping
- `README.md` — Quick start and overview (this file)

## OpenClaw operations

- `openclaw plugins list --json`
- `openclaw plugins inspect openclaw-yuki --runtime --json`
- `openclaw plugins doctor`
- `openclaw doctor --fix`
- `openclaw gateway restart`

## Documentation

- `docs/PHASE_PLAN.md`
- `docs/YUKI_API_CAPABILITY_MATRIX.md`
- `docs/CONFIGURATION.md`
- `docs/SECURITY.md`
- `docs/OPERATIONS.md`

## Next planned phase

Phase 4: read and write tools for contacts, projects, and archive document operations with safe file handling.
