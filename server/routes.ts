import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server on a specific path so it doesn't conflict with Vite's HMR
  const wss = new WebSocketServer({ server: httpServer, path: "/debug-ws" });

  // Create a debug WebSocket server to help diagnose connection issues
  // This will help users test WebSocket connections if they can't connect to the external one
  wss.on("connection", (ws) => {
    console.log("Debug WebSocket connection established");
    
    // Create unique session ID for this connection
    const sessionId = `debug-${Date.now()}`;

    // Send a welcome message
    ws.send(
      JSON.stringify({
        event: "connection_established",
        data: {
          message: "Connected to local debug WebSocket server",
          sid: sessionId,
          server_info: {
            type: "debug",
            version: "1.0.0",
          },
        },
      }),
    );

    // Listen for messages
    ws.on("message", (message) => {
      console.log("Debug WebSocket received:", message.toString());

      try {
        const parsedMessage = JSON.parse(message.toString());
        const eventName = parsedMessage.event;
        const data = parsedMessage.data;

        // Echo back any message with some debug info
        ws.send(
          JSON.stringify({
            event: "debug_echo",
            data: {
              original_event: eventName,
              original_data: data,
              timestamp: new Date().toISOString(),
              message:
                "This is a debug echo response from the local WebSocket server",
            },
          }),
        );

        // Handle Socket.IO compatibility for common events
        switch (eventName) {
          case "create_project":
            console.log("Creating debug project:", data);
            // Send project initializing message
            ws.send(
              JSON.stringify({
                event: "project_initializing",
                data: {
                  message: "Project is initializing...",
                  project_type: data?.type || "base",
                },
              }),
            );

            // After a short delay, send project ready message
            setTimeout(() => {
              const projectId = `debug-project-${Date.now()}`;
              ws.send(
                JSON.stringify({
                  event: "project_ready",
                  data: {
                    project_id: projectId,
                    message: "Debug project ready (local WebSocket server)",
                  },
                }),
              );
            }, 1000);
            break;

          case "project_command":
            console.log("Processing project command:", data);
            
            // Handle different command types
            switch (data?.command) {
              case "createTerminal":
                setTimeout(() => {
                  const terminalId = `term_${Date.now()}_0`;
                  ws.send(
                    JSON.stringify({
                      event: "command_result",
                      data: {
                        command: "createTerminal",
                        result: {
                          id: terminalId,
                          status: "ready",
                        },
                      },
                    }),
                  );
                }, 500);
                break;
                
              case "saveFile":
                setTimeout(() => {
                  ws.send(
                    JSON.stringify({
                      event: "command_result",
                      data: {
                        command: "saveFile",
                        args: data.args,
                        result: {
                          output: `File ${data.args.path} saved in debug mode`,
                          exit_code: 0,
                        },
                      },
                    }),
                  );
                }, 300);
                break;
                
              case "runCommand":
                setTimeout(() => {
                  // First send command acknowledgement
                  ws.send(
                    JSON.stringify({
                      event: "command_result",
                      data: {
                        command: "runCommand",
                        args: data.args,
                        result: {
                          status: "running",
                          terminal_id: data.args.terminal_id,
                        },
                      },
                    }),
                  );
                  
                  // Then send terminal output
                  setTimeout(() => {
                    ws.send(
                      JSON.stringify({
                        event: "terminalResponse",
                        data: {
                          id: data.args.terminal_id,
                          data: `Executing: ${data.args.command}\nhello\n`,
                        },
                      }),
                    );
                  }, 200);
                }, 300);
                break;
                
              case "terminal_input":
                setTimeout(() => {
                  ws.send(
                    JSON.stringify({
                      event: "command_result",
                      data: {
                        command: "terminal_input",
                        args: data.args,
                        result: {
                          output: `Debug output for command: ${data.args.input}`,
                          exit_code: 0,
                        },
                      },
                    }),
                  );
                }, 500);
                break;
                
              default:
                ws.send(
                  JSON.stringify({
                    event: "command_result",
                    data: {
                      command: data?.command || "unknown",
                      args: data?.args || {},
                      result: {
                        output: `Unknown command: ${data?.command}`,
                        exit_code: 1,
                      },
                    },
                  }),
                );
            }
            break;
        }
      } catch (e) {
        console.error("Error processing debug WebSocket message:", e);
      }
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({ event: "ping", data: { timestamp: Date.now() } }),
        );
      }
    }, 30000);

    // Clean up on connection close
    ws.on("close", () => {
      console.log("Debug WebSocket connection closed");
      clearInterval(pingInterval);
    });
  });

  // Add a simple API endpoint to check server status
  app.get("/api/status", (req, res) => {
    res.json({
      status: "online",
      features: {
        debug_websocket: true,
        external_websocket: true,
      },
      debug_websocket_url: "ws://3.131.13.46:8000",
    });
  });

  return httpServer;
}
