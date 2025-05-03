import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from 'ws';

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server on a specific path so it doesn't conflict with Vite's HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/debug-ws' });

  // Create a debug WebSocket server to help diagnose connection issues
  // This will help users test WebSocket connections if they can't connect to the external one
  wss.on('connection', (ws) => {
    console.log('Debug WebSocket connection established');
    
    // Send a welcome message
    ws.send(JSON.stringify({
      event: 'connection_established',
      data: {
        message: 'Connected to local debug WebSocket server',
        sid: `debug-${Date.now()}`,
        server_info: {
          type: 'debug',
          version: '1.0.0'
        }
      }
    }));
    
    // Listen for messages
    ws.on('message', (message) => {
      console.log('Debug WebSocket received:', message.toString());
      
      try {
        const parsedMessage = JSON.parse(message.toString());
        
        // Echo back any message with some debug info
        ws.send(JSON.stringify({
          event: 'debug_echo',
          data: {
            original_event: parsedMessage.event,
            original_data: parsedMessage.data,
            timestamp: new Date().toISOString(),
            message: 'This is a debug echo response from the local WebSocket server'
          }
        }));
        
        // If it's a create_project command, send a project_ready message
        if (parsedMessage.event === 'create_project') {
          setTimeout(() => {
            ws.send(JSON.stringify({
              event: 'project_ready',
              data: {
                project_id: parsedMessage.data?.id || `debug-project-${Date.now()}`,
                message: 'Debug project ready (local WebSocket server)'
              }
            }));
          }, 1000);
        }
        
        // If it's a project_command of type terminal_input, echo back a command result
        if (parsedMessage.event === 'project_command' && 
            parsedMessage.data?.command === 'terminal_input') {
          setTimeout(() => {
            ws.send(JSON.stringify({
              event: 'command_result',
              data: {
                command: 'terminal_input',
                args: parsedMessage.data.args,
                result: {
                  output: `Debug output for command: ${parsedMessage.data.args.input}`,
                  exit_code: 0
                }
              }
            }));
          }, 500);
        }
        
        // If it's a project_command of type save_file, echo back a command result
        if (parsedMessage.event === 'project_command' && 
            parsedMessage.data?.command === 'save_file') {
          setTimeout(() => {
            ws.send(JSON.stringify({
              event: 'command_result',
              data: {
                command: 'save_file',
                args: parsedMessage.data.args,
                result: {
                  output: `File ${parsedMessage.data.args.filename} saved in debug mode`,
                  exit_code: 0
                }
              }
            }));
          }, 300);
        }
      } catch (e) {
        console.error('Error processing debug WebSocket message:', e);
      }
    });
    
    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ event: 'ping', data: { timestamp: Date.now() } }));
      }
    }, 30000);
    
    // Clean up on connection close
    ws.on('close', () => {
      console.log('Debug WebSocket connection closed');
      clearInterval(pingInterval);
    });
  });
  
  // Add a simple API endpoint to check server status
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'online',
      features: {
        debug_websocket: true,
        external_websocket: true
      },
      debug_websocket_url: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.headers.host}/debug-ws`,
      external_websocket_url: 'ws://3.131.13.46:8000'
    });
  });
  
  return httpServer;
}
