# Operational Runbook - OpenClaw Yuki Plugin (Phase 8)

## Table of Contents

1. [Deployment Guide](#deployment-guide)
2. [Configuration Management](#configuration-management)
3. [Monitoring & Observability](#monitoring--observability)
4. [Troubleshooting Guide](#troubleshooting-guide)
5. [Performance Tuning](#performance-tuning)
6. [Security Operations](#security-operations)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Incident Response](#incident-response)

---

## Deployment Guide

### Prerequisites

- Node.js 22+ LTS (minimum recommended for production)
- npm 10+ or yarn 4+
- OpenClaw Gateway v2026.3.24-beta.2 or later
- Network access to Yuki SOAP endpoints

### Installation Steps

#### 1. Plugin Installation

```bash
# Option A: Via npm registry
npm install @tokaio/openclaw-yuki

# Option B: From source
git clone https://github.com/Paul-Geudens_argenta/yuki-openclaw-plugin.git
cd yuki-openclaw-plugin
npm install
npm run build
npm link  # For local development
```

#### 2. OpenClaw Registration

```bash
# Verify plugin is detected
openclaw plugins list --json | grep openclaw-yuki

# Inspect plugin configuration
openclaw plugins inspect openclaw-yuki --runtime

# Doctor check (comprehensive validation)
openclaw doctor
openclaw doctor --fix
```

#### 3. Configuration Setup

Create `.env` file or set environment variables:

```bash
# Required
export YUKI_ACCESS_KEY="your-access-key-here"
export YUKI_COUNTRY="nl"  # or "be"

# Recommended
export YUKI_REQUEST_TIMEOUT_MS="30000"
export YUKI_MAX_CALLS_PER_MINUTE="60"
export YUKI_MAX_CALLS_PER_DAY="10000"
export YUKI_LOG_LEVEL="info"
```

#### 4. Validation

```bash
# CLI health check
yuki-cli health

# Comprehensive setup validation
yuki-cli validate-setup --format json

# List accessible administrations
yuki-cli list-administrations
```

#### 5. OpenClaw Gateway Activation

```bash
# Restart gateway with plugin
openclaw gateway restart

# Verify plugin is active
openclaw plugins inspect openclaw-yuki
```

### Rollback Procedure

```bash
# If issues occur after deployment:
1. Disable plugin in OpenClaw
2. Restart gateway: openclaw gateway restart
3. Verify functionality
4. Review logs: openclaw logs --follow
5. Downgrade if needed: npm install @tokaio/openclaw-yuki@<previous-version>
```

---

## Configuration Management

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `YUKI_ACCESS_KEY` | Yes | - | Yuki webservice access key |
| `YUKI_COUNTRY` | Yes | - | Yuki server region: `be` or `nl` |
| `YUKI_REQUEST_TIMEOUT_MS` | No | 30000 | HTTP request timeout |
| `YUKI_MAX_CALLS_PER_MINUTE` | No | 60 | Rate limit - calls per minute |
| `YUKI_MAX_CALLS_PER_DAY` | No | 10000 | Rate limit - calls per day |
| `YUKI_LOG_LEVEL` | No | info | Log level: debug, info, warn, error |
| `YUKI_INCLUDE_RAW_RESPONSES` | No | false | Include raw XML in responses |

---

## Monitoring & Observability

### Health Checks

```bash
# Quick health check
yuki-cli health

# JSON output for parsing
yuki-cli health --format json

# OpenClaw plugin status
openclaw plugins inspect openclaw-yuki
```

### Logging

#### Log Levels

- **debug**: Detailed diagnostic information
- **info**: General operational information
- **warn**: Warning conditions
- **error**: Error conditions

#### Accessing Logs

```bash
# OpenClaw logs
openclaw logs --follow

# Search logs
openclaw logs | grep "yuki-openclaw"

# Export logs
openclaw logs --export > logs.jsonl
```

#### Log Redaction

All sensitive data (API keys, session IDs) are automatically redacted from logs.

---

## Troubleshooting Guide

### Common Issues

#### 1. "Connection refused" / "ECONNREFUSED"

**Problem**: Cannot connect to Yuki API

**Solutions**:
1. Verify network/firewall allows HTTPS (port 443)
2. Check VPN connection if required
3. Confirm country setting matches endpoint (be/nl)
4. Verify ISP doesn't block Yuki endpoints

```bash
# Test connectivity
ping api.yukiworks.be
curl -I https://api.yukiworks.be/ws/Accounting.asmx
```

#### 2. "Authentication failed" / "SOAP fault 401"

**Problem**: Access key rejected

**Solutions**:
1. Regenerate access key in Yuki admin panel
2. Verify no whitespace in access key
3. Confirm key has required service permissions
4. Check key hasn't expired

```bash
# Verify config is loaded
yuki-cli validate-config --verbose
```

#### 3. "SOAP fault 500" / Internal Server Error

**Problem**: Yuki API error

**Solutions**:
1. Check Yuki API status
2. Retry with exponential backoff
3. Contact Yuki support with session ID from logs

#### 4. "Rate limit exceeded"

**Problem**: Too many requests

**Solutions**:
1. Increase `YUKI_MAX_CALLS_PER_MINUTE` if quota allows
2. Implement request queuing/batching
3. Reduce polling frequency

#### 5. "Configuration missing" / Invalid configuration

**Problem**: Environment not set up correctly

**Solutions**:
1. Set required env vars: `YUKI_ACCESS_KEY`, `YUKI_COUNTRY`
2. Create `.env` file in working directory
3. Verify file permissions allow reading

```bash
# Validate configuration
yuki-cli validate-config
```

### Debug Mode

Enable comprehensive logging:

```bash
# Set debug log level
export YUKI_LOG_LEVEL=debug

# Include raw responses
export YUKI_INCLUDE_RAW_RESPONSES=true

# Run command with verbose output
yuki-cli health --verbose
```

---

## Performance Tuning

### Request Timeout

For slow networks, increase timeout:

```bash
export YUKI_REQUEST_TIMEOUT_MS=60000  # 60 seconds
```

### Rate Limiting

Adjust rate limits for your quota:

```bash
export YUKI_MAX_CALLS_PER_MINUTE=120
export YUKI_MAX_CALLS_PER_DAY=20000
```

---

## Security Operations

### Access Key Management

#### Rotation

```bash
# 1. Generate new key in Yuki admin
# 2. Update environment
export YUKI_ACCESS_KEY="new-key"

# 3. Verify connectivity
yuki-cli health

# 4. Remove old key from Yuki admin
```

#### Secure Storage

Never commit access keys to source control:

```bash
# Use .env.local (in .gitignore)
echo "YUKI_ACCESS_KEY=your-key" > .env.local
```

### Audit Logging

Enable detailed audit trail:

```bash
# All operations logged (sanitized)
openclaw logs --export --filter "yuki" > audit.jsonl
```

---

## Maintenance Procedures

### Updates

#### Check for Updates

```bash
npm outdated @tokaio/openclaw-yuki
```

#### Update Procedure

```bash
# 1. Test in development
npm install @tokaio/openclaw-yuki@latest

# 2. Run tests
npm run test

# 3. Run validation
yuki-cli validate-setup

# 4. Monitor logs after update
openclaw logs --follow
```

### Cleanup

#### Session Cache Cleanup

```bash
# Remove old session cache
rm ~/.yuki-session
```

---

## Incident Response

### Service Outage

1. **Detect**: Check plugin status
2. **Assess**: 
   ```bash
   yuki-cli health --format json
   openclaw logs --follow
   ```
3. **Mitigate**: Check Yuki status page, retry if transient
4. **Recover**:
   ```bash
   openclaw gateway restart
   yuki-cli validate-setup
   ```

### Performance Degradation

1. **Diagnose**:
   ```bash
   yuki-cli health --verbose
   openclaw logs | grep "rate"
   ```
2. **Actions**:
   - Increase timeouts if network slow
   - Reduce request rate if approaching limits

### Security Incident

1. **Immediate**: If key compromised, disable in Yuki admin
2. **Generate**: New access key
3. **Update**: Environment with new key
4. **Audit**: Review recent operations
   ```bash
   openclaw logs --export > incident_audit.jsonl
   ```

---

## Support & Resources

- Plugin repo: https://github.com/Paul-Geudens_argenta/yuki-openclaw-plugin
- Yuki Support: https://support.yukiworks.be
- OpenClaw Support: contact your provider
- CLI reference: `yuki-cli help`

