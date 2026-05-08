/**
 * File validator for safe document handling
 * Validates content-type, file size, and filename safety
 */

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  contentType?: string;
  recommendedExtension?: string;
}

// Whitelist of allowed MIME types for document operations
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/xml",
  "application/xml",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/tiff",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed"
]);

// MIME type to extension mapping
const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "text/xml": ".xml",
  "application/xml": ".xml",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/tiff": ".tiff",
  "application/zip": ".zip",
  "application/x-rar-compressed": ".rar",
  "application/x-7z-compressed": ".7z"
};

// File extension to MIME type mapping for detection
const EXTENSION_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".xml": "text/xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed"
};

export function validateContentType(contentType: string | undefined): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!contentType || contentType.trim().length === 0) {
    errors.push("Content-Type is required");
    return { valid: false, errors, warnings };
  }

  // Extract base MIME type (strip charset, boundary, etc.)
  const baseMime = contentType.split(";")[0].trim().toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(baseMime)) {
    errors.push(`Content-Type '${baseMime}' is not in whitelist of allowed types`);
  }

  // Check for suspicious patterns
  if (baseMime.includes("executable") || baseMime.includes("script") || baseMime.includes("octet-stream")) {
    errors.push(`Content-Type '${baseMime}' is not allowed for security reasons`);
  }

  const recommendedExtension = MIME_TO_EXTENSION[baseMime];

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    contentType: baseMime,
    recommendedExtension
  };
}

export function validateFilename(filename: string | undefined, contentType?: string): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!filename || filename.trim().length === 0) {
    errors.push("Filename is required");
    return { valid: false, errors, warnings };
  }

  // Check for path traversal attempts
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    errors.push("Filename contains invalid path characters");
  }

  // Check for null bytes
  if (filename.includes("\x00")) {
    errors.push("Filename contains null bytes");
  }

  // Check filename length
  if (filename.length > 255) {
    errors.push("Filename exceeds 255 characters");
  }

  // Check for suspicious extensions
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  const suspiciousExts = [".exe", ".bat", ".com", ".cmd", ".scr", ".vbs", ".ps1", ".sh"];
  if (suspiciousExts.includes(ext)) {
    errors.push(`File extension '${ext}' is not allowed`);
  }

  // Validate extension matches content-type if both provided
  if (contentType && ext) {
    const baseMime = contentType.split(";")[0].trim().toLowerCase();
    const expectedExt = MIME_TO_EXTENSION[baseMime];

    if (expectedExt && !filename.toLowerCase().endsWith(expectedExt)) {
      warnings.push(`File extension '${ext}' may not match content-type '${baseMime}' (expected '${expectedExt}')`);
    }
  }

  // Warn about spaces and special chars
  if (/[^a-zA-Z0-9._\-]/.test(filename)) {
    warnings.push("Filename contains spaces or special characters; consider simplifying for compatibility");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    contentType,
    recommendedExtension: MIME_TO_EXTENSION[contentType?.split(";")[0].trim().toLowerCase() ?? ""]
  };
}

export function validateFileSize(fileSizeBytes: number | undefined, maxSizeMB: number = 100): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (fileSizeBytes === undefined || fileSizeBytes === null) {
    warnings.push("File size not provided; cannot validate size limit");
    return { valid: true, errors, warnings };
  }

  if (fileSizeBytes < 0) {
    errors.push("File size cannot be negative");
    return { valid: false, errors, warnings };
  }

  if (fileSizeBytes === 0) {
    warnings.push("File size is 0 bytes; empty file detected");
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (fileSizeBytes > maxSizeBytes) {
    errors.push(`File size (${Math.round(fileSizeBytes / 1024 / 1024)}MB) exceeds maximum (${maxSizeMB}MB)`);
  }

  if (fileSizeBytes > 50 * 1024 * 1024) {
    warnings.push(`Large file (${Math.round(fileSizeBytes / 1024 / 1024)}MB); upload may be slow`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateFileForUpload(
  filename: string | undefined,
  contentType: string | undefined,
  fileSizeBytes?: number,
  maxSizeMB?: number
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check filename
  const filenameResult = validateFilename(filename, contentType);
  errors.push(...filenameResult.errors);
  warnings.push(...filenameResult.warnings);

  // Check content-type
  const contentTypeResult = validateContentType(contentType);
  errors.push(...contentTypeResult.errors);
  warnings.push(...contentTypeResult.warnings);

  // Check file size
  const fileSizeResult = validateFileSize(fileSizeBytes, maxSizeMB ?? 100);
  errors.push(...fileSizeResult.errors);
  warnings.push(...fileSizeResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    contentType: contentTypeResult.contentType,
    recommendedExtension: filenameResult.recommendedExtension
  };
}

export function detectContentTypeFromFilename(filename: string): string | undefined {
  if (!filename) {
    return undefined;
  }

  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return EXTENSION_TO_MIME[ext];
}

export function getFileSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}
