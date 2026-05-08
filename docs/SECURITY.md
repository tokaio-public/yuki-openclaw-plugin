# Security

## Secret handling
- No hardcoded credentials in source.
- Access keys loaded from env or OpenClaw plugin config.
- Required config missing -> fail closed.

## Logging and redaction
- API keys, session IDs, invoice payloads, customer details, and bank details are redacted.
- Sensitive payload logging is disabled by default.
- Debug mode can include more context, still redacted unless explicitly allowed.

## Transport requirements
- HTTPS endpoints only.
- Intended for TLS 1.2+ per Yuki requirements.

## Write-operation safety model
- Write operations are disabled by default.
- Future write tools must enforce:
  - writeOperationsEnabled = true
  - dryRun = false
  - confirm = true
  - confirmationSummary present
- Default behavior should remain preview-first.

## Audit strategy
- Write operations should produce audit entries with:
  - timestamp
  - tool name
  - domain and administration IDs
  - hashed payload fingerprint
  - success/failure
  - request ID
- Never persist full raw accounting payloads in audit logs by default.

## Known risks
- Misconfigured permissions on Yuki key can allow broader access than intended.
- Leaking raw SOAP envelopes can expose accounting-sensitive data.
- Domain-context mistakes can target the wrong domain if SetCurrentDomain is not explicit.
