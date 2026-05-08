# Configuration

## Required
- YUKI_ACCESS_KEY: Yuki WebserviceAccessKey.

## Optional
- YUKI_COUNTRY: be or nl. Default: be.
- YUKI_DEFAULT_DOMAIN_ID: default domain ID for domain-scoped calls.
- YUKI_DEFAULT_ADMINISTRATION_ID: default administration ID.
- YUKI_REQUEST_TIMEOUT_MS: request timeout in milliseconds. Default: 15000.
- YUKI_MAX_CALLS_PER_MINUTE: local safety budget. Default: 120.
- YUKI_MAX_CALLS_PER_DAY: local safety budget. Default: 900.
- YUKI_WRITE_OPERATIONS_ENABLED: true/false. Default: false.
- YUKI_DEFAULT_DRY_RUN: true/false. Default: true.
- YUKI_LOG_LEVEL: error/warn/info/debug. Default: info.
- YUKI_INCLUDE_RAW_RESPONSES: include raw payload on success. Default: false.
- YUKI_ALLOW_SENSITIVE_DEBUG_LOGGING: allow sensitive debug output. Default: false.

## OpenClaw plugin config
The same keys are available under plugins.entries.openclaw-yuki.config.

Example:

```json5
{
  plugins: {
    entries: {
      "openclaw-yuki": {
        enabled: true,
        config: {
          accessKey: "REDACTED",
          country: "be",
          requestTimeoutMs: 15000,
          writeOperationsEnabled: false,
          defaultDryRun: true
        }
      }
    }
  }
}
```

## Endpoint selection
- Belgium: https://api.yukiworks.be/ws
- Netherlands: https://api.yukiworks.nl/ws

## Yuki access key guidance
- Create least-privilege API keys in Yuki with only required webservices.
- Prefer separate keys per environment/use case.
- Validate service rights if you see "API-key has no rights to access this web service".
