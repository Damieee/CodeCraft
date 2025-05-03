import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // We won't add any server-side routes, since all the communication
  // will be handled by the external WebSocket server at ws://3.131.13.46:8000
  
  // The client will connect directly to that WebSocket server
  
  return httpServer;
}
