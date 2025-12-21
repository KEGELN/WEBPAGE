// server/utils.ts
export function logApiCall(command: string, params?: Record<string, any>) {
  console.log(`API call intercepted for command: ${command}`, params || {});
}

export function formatErrorResponse(error: any, command: string) {
  console.error(`Error processing command ${command}:`, error);
  return { error: 'Internal server error', command };
}

export function formatSuccessResponse(data: any, command: string) {
  return { data, command, success: true };
}

// Helper to validate command parameters
export function validateParams(params: Record<string, any>, required: string[]): boolean {
  for (const param of required) {
    if (!params[param]) {
      return false;
    }
  }
  return true;
}