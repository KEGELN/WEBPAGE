// server/index.ts
import APIHandler from './api-handler';
import { PlayerHandler } from './player-handler';

// Export the handlers
export { APIHandler, PlayerHandler };

// Export a default instance for convenience
const apiHandler = new APIHandler();
const playerHandler = new PlayerHandler();

export { apiHandler, playerHandler };

// Also export the classes themselves
export type { APIHandler as APIHandlerType, PlayerHandler as PlayerHandlerType };