export interface WriteConfirmationInput {
  dryRun?: boolean;
  confirm?: boolean;
  confirmationSummary?: string;
}

export function assertWriteConfirmation(input: WriteConfirmationInput, writeEnabled: boolean): void {
  if (!writeEnabled) {
    throw new Error("Write operations are disabled. Set writeOperationsEnabled=true in plugin config.");
  }

  const dryRun = input.dryRun ?? true;
  if (dryRun) {
    throw new Error("dryRun=true: preview mode only. Set dryRun=false together with explicit confirmation.");
  }

  if (input.confirm !== true) {
    throw new Error("confirm=true is required for state-changing operations.");
  }

  if (!input.confirmationSummary || input.confirmationSummary.trim().length < 10) {
    throw new Error("confirmationSummary is required and must be descriptive.");
  }
}
