// server/index.ts
import APIHandler from './api-handler';

// Export the handlers
export { APIHandler };

// Export a default instance for convenience
const apiHandler = new APIHandler();

export { apiHandler };

// Also export the classes themselves
export type { APIHandler as APIHandlerType };