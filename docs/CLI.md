# CLI Diagnostics Documentation (Phase 7)

## Overview

Phase 7 introduces a standalone CLI tool for OpenClaw Yuki plugin diagnostics. The CLI provides commands to validate plugin setup, test connectivity, and troubleshoot configuration issues without requiring the full OpenClaw gateway.

## Architecture

The CLI is built as a separate module:
- `src/cli/formatter.ts` — Output formatters (text, JSON, CSV, table)
- `src/cli/commands.ts` — Command implementations and routing
- `src/cli/index.ts` — CLI entry point and Node.js executable

All CLI commands reuse the existing `YukiClient` and configuration system, ensuring consistency with the plugin behavior.

## Supported Commands

### health
Test connectivity to Yuki SOAP API and validate authentication.

```bash
yuki-cli health
yuki-cli health --format json
```

**Output**: Connection status, API call estimate, timestamp

### validate-config  
Check plugin configuration for completeness and correctness.

```bash
yuki-cli validate-config
yuki-cli validate-config --verbose
```

**Validates**:
- YUKI_ACCESS_KEY set and non-empty
- YUKI_COUNTRY configured (be/nl)
- Request timeout configured
- Rate limits configured

### list-domains
Enumerate accessible domains for the authenticated account.

```bash
yuki-cli list-domains
yuki-cli list-domains --format table
yuki-cli list-domains --format csv > domains.csv
```

**Output**: Domain ID, name

### list-administrations  
Enumerate accessible administrations (companies/accounting entities).

```bash
yuki-cli list-administrations
yuki-cli list-administrations --format json
```

**Output**: Administration ID, name

### validate-setup
Run comprehensive setup validation with all checks:
1. Configuration validation
2. Connectivity test
3. Domain enumeration
4. Administration enumeration

```bash
yuki-cli validate-setup
yuki-cli validate-setup --format json --verbose
```

**Output**: Pass/fail/warn status for each check, summary statistics, exit code 0 (all pass) or 1 (failures present)

### version
Display plugin version information.

```bash
yuki-cli version
yuki-cli version --format json
```

### help  
Show command help and usage examples.

```bash
yuki-cli help
yuki-cli --help
yuki-cli -h
```

## Output Formats

### Text (default)
Human-readable output with symbols and colors suitable for terminal display.

```
✓ Health check passed
Duration: 1.23s
API calls: 1
Timestamp: 2024-01-15T10:30:00.000Z
```

### JSON
Machine-readable JSON output suitable for scripting and CI/CD pipelines.

```bash
yuki-cli health --format json
```

```json
{
  "status": "ok",
  "message": "Plugin health check passed",
  "duration": 1230,
  "apiCallsUsedEstimate": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Table
Fixed-width table format suitable for comparing multiple items.

```bash
yuki-cli list-administrations --format table
```

```
id  | name
────┼────────────
100 | Main Office
101 | Branch A
```

### CSV  
Comma-separated values format suitable for spreadsheets and data processing.

```bash
yuki-cli list-administrations --format csv
```

```csv
id,name
100,Main Office
101,Branch A
```

## Options

### --verbose, -v
Enable verbose output with additional details.

```bash
yuki-cli health --verbose
```

### --format <fmt>
Specify output format: text, json, table, csv

```bash
yuki-cli list-domains --format json
yuki-cli validate-setup --format csv
```

## Installation

### Via npm

```bash
# Global installation
npm install -g @tokaio/openclaw-yuki
yuki-cli health

# Local installation
npm install @tokaio/openclaw-yuki
npx yuki-cli health

# Development installation with npm link
npm install
npm link
yuki-cli health
```

### Via npx

```bash
# Run without installation
npx @tokaio/openclaw-yuki health
npx @tokaio/openclaw-yuki validate-setup --format json
```

## Configuration

CLI commands respect all standard Yuki plugin configuration:

**Environment variables:**
```bash
export YUKI_ACCESS_KEY="your-access-key"
export YUKI_COUNTRY="nl"  # or "be"
export YUKI_REQUEST_TIMEOUT_MS="30000"
```

**Dotenv file:**
Create `.env` in the working directory:
```
YUKI_ACCESS_KEY=your-access-key
YUKI_COUNTRY=nl
YUKI_REQUEST_TIMEOUT_MS=30000
```

**Plugin config (OpenClaw):**
Configuration passed to the plugin via OpenClaw is also respected by CLI.

## Exit Codes

- `0` — Success (all checks passed)
- `1` — Failure (validation failed, command error)

## Use Cases

### CI/CD Pipeline Setup Validation

```bash
#!/bin/bash
set -e

echo "Running Yuki plugin setup validation..."
yuki-cli validate-setup --format json | jq .

if [ $? -ne 0 ]; then
  echo "Setup validation failed"
  exit 1
fi

echo "Setup is valid, proceeding with deployment..."
```

### Troubleshooting Configuration Issues

```bash
# Check if configuration is valid
yuki-cli validate-config

# Test connectivity
yuki-cli health

# List available administrations
yuki-cli list-administrations

# Full validation report
yuki-cli validate-setup
```

### Exporting Data

```bash
# Export domains as CSV
yuki-cli list-domains --format csv > domains.csv

# Export administrations as JSON for processing
yuki-cli list-administrations --format json | jq '.administrations[] | .name'
```

### Monitoring and Alerting

```bash
#!/bin/bash
# Check plugin health periodically
status=$(yuki-cli health --format json | jq -r '.status')

if [ "$status" != "ok" ]; then
  # Send alert
  curl -X POST https://alerts.example.com \
    -d "Yuki plugin health check failed"
fi
```

## Error Handling

CLI commands provide detailed error messages:

```bash
$ yuki-cli health
✗ Health check failed: ECONNREFUSED - Connection refused

$ yuki-cli validate-config  
✗ Configuration incomplete - check ACCESS_KEY and COUNTRY env vars

$ yuki-cli unknown-command
Unknown command: unknown-command

Run 'yuki-cli help' for usage information.
```

## Performance

CLI commands are optimized for quick execution:
- Single Yuki API call per command (except `validate-setup` which runs ~4 checks)
- Session caching reused from plugin
- No unnecessary network requests

Typical execution times:
- `health`: ~500ms-1s
- `validate-config`: <10ms
- `list-domains`: ~500ms-1s  
- `list-administrations`: ~500ms-1s
- `validate-setup`: ~3-5s (all checks sequential)

## Testing

CLI tests cover:
- All output formatters (text, JSON, CSV, table)
- All commands with different options
- Format variations (--format json, --format csv, etc.)
- Error conditions and exit codes
- Help and version commands

Run tests with:
```bash
npm test -- cli-commands.test
```

## Future Enhancements

Potential additions for future phases:
- Additional diagnostic commands (permission testing, rate limit status)
- CSV batch import from CLI
- Interactive mode for troubleshooting
- Colored output for terminals
- Configuration file generation helper
- Performance profiling commands
- Integration test suites

## Troubleshooting

### "Command not found: yuki-cli"

Install globally or use `npm link`:
```bash
npm install -g @tokaio/openclaw-yuki
# or
npm link
```

### "Failed to load config from environment"

Ensure required environment variables are set:
```bash
export YUKI_ACCESS_KEY="your-key"
export YUKI_COUNTRY="nl"
yuki-cli health
```

### "Health check failed"

1. Verify access key is valid
2. Check network connectivity to Yuki API
3. Confirm correct country setting (be/nl)
4. Review detailed error: `yuki-cli health --verbose`

### "Unknown command"

View available commands:
```bash
yuki-cli help
```

## See Also

- [CONFIGURATION.md](./CONFIGURATION.md) — Detailed configuration reference
- [PHASE_PLAN.md](./PHASE_PLAN.md) — Phase 7 acceptance criteria
- [SECURITY.md](./SECURITY.md) — Security and redaction behavior
