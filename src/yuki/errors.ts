export class YukiError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;

  public constructor(code: string, message: string, recoverable = true) {
    super(message);
    this.name = "YukiError";
    this.code = code;
    this.recoverable = recoverable;
  }
}

export class YukiConfigError extends YukiError {
  public constructor(message: string) {
    super("YUKI_CONFIG_INVALID", message, false);
    this.name = "YukiConfigError";
  }
}

export class YukiAuthError extends YukiError {
  public constructor(message: string) {
    super("YUKI_AUTH_FAILED", message, true);
    this.name = "YukiAuthError";
  }
}

export class YukiPermissionError extends YukiError {
  public constructor(message: string) {
    super("YUKI_PERMISSION_DENIED", message, true);
    this.name = "YukiPermissionError";
  }
}

export class YukiRateLimitError extends YukiError {
  public constructor(message: string) {
    super("YUKI_RATE_LIMIT", message, true);
    this.name = "YukiRateLimitError";
  }
}

export class YukiSoapFaultError extends YukiError {
  public constructor(message: string) {
    super("YUKI_SOAP_FAULT", message, true);
    this.name = "YukiSoapFaultError";
  }
}
