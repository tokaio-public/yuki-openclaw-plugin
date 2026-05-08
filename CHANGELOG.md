# Changelog

## Unreleased
- Security: upgraded `fast-xml-parser` to `^5.7.3`.
- Security: added explicit HTTP status handling before SOAP XML parsing.
- Security: redaction expanded to include UUID-form session tokens.
- Security: client config exposure now masks raw access key and reports `accessKeyConfigured`.
- Security: `rawData` fields are excluded from tool responses unless `includeRawResponses` is enabled.
- Validation: XML well-formedness now uses parser-based validation instead of regex heuristics.
- Validation: `yuki_download_document` now uses `DocumentDownloadSchema` TypeBox validation.
- Services: contact mapping aligned to `contactId`/`contactType` and integration mapping expanded for Dutch field variants.
- Services: month-end checklist IDs standardized to hyphenated identifiers.
- Tests: unit suite currently runs at 176 passing, 1 skipped.

## 0.1.0
- Phase 0: OpenClaw plugin skeleton and strict TypeScript setup.
- Phase 1: SOAP client wrapper, auth/session handling, domain/administration tools.
- Added docs for configuration, security, operations, phase plan, and Yuki capability matrix.
