// Using browser's native WebSocket API
let socket: WebSocket | null = null;
let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

// When we receive messages from the server, dispatch custom events
const handleMessage = (eventName: string, data: any) => {
  const event = new CustomEvent(`socket:${eventName}`, { detail: data });
  window.dispatchEvent(event);
};

// Parse WebSocket message data
const parseMessage = (data: string) => {
  try {
    const parsed = JSON.parse(data);
    return {
      event: parsed.event || 'message',
      data: parsed.data || parsed
    };
  } catch (e) {
    return {
      event: 'message',
      data: data
    };
  }
};

export const connectToSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) return;
  
  // Clear any existing socket
  if (socket) {
    socket.close();
    socket = null;
  }
  
  // Clear any existing timeout
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
  }
  
  try {
    // Use the correct protocol based on the current page protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    // Try to connect directly to the external WebSocket server by default
    const wsUrl = `${protocol}//3.131.13.46:8000`;
    
    // Allow using the local debug server via URL parameter for testing
    // Example: http://localhost:5000/?debug=true
    const urlParams = new URLSearchParams(window.location.search);
    const useDebugServer = urlParams.get('debug') === 'true';
    
    // If debug mode is enabled, use the local debug server instead
    const finalWsUrl = useDebugServer
      ? `${protocol}//${window.location.host}/debug-ws`
      : wsUrl;
    
    console.log(`Connecting to WebSocket at ${finalWsUrl}${useDebugServer ? ' (debug mode)' : ''}`);
    
    // Connect to the selected WebSocket server
    socket = new WebSocket(finalWsUrl);
    
    // Set a timeout to detect connection issues
    connectionTimeout = setTimeout(() => {
      if (socket && socket.readyState !== WebSocket.OPEN) {
        console.error("WebSocket connection timeout");
        socket.close();
        handleMessage("connect_error", { message: "Connection timeout - server not responding" });
        connectionTimeout = null;
      }
    }, 10000); // 10 second timeout
    
    socket.onopen = () => {
      console.log("Socket connected successfully");
      
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      handleMessage("connect", null);
      
      // Immediately after connection, send an initial handshake
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          event: 'connection_request',
          data: { 
            client_id: `web_client_${Date.now()}`,
            client_info: {
              type: 'web',
              url: window.location.href,
              language: navigator.language
            }
          }
        }));
      }
    };
    
    socket.onclose = (event) => {
      console.log(`Socket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
      
      // Clear timeout if it exists
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      handleMessage("disconnect", { code: event.code, reason: event.reason });
    };
    
    socket.onerror = (error) => {
      console.error("Socket error", error);
      
      // Clear timeout if it exists
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      handleMessage("error", { message: "WebSocket connection error" });
      handleMessage("connect_error", { message: "Failed to connect to server" });
    };
    
    socket.onmessage = (event) => {
      try {
        console.log("Raw message received:", event.data);
        const { event: eventName, data } = parseMessage(event.data);
        console.log(`Received event: ${eventName}`, data);
        
        // Handle specific events
        switch (eventName) {
          case 'connection_established':
            handleMessage("connection_established", data);
            break;
          case 'project_initializing':
            handleMessage("project_initializing", data);
            break;
          case 'project_ready':
            handleMessage("project_ready", data);
            break;
          case 'project_error':
            handleMessage("project_error", data);
            break;
          case 'command_result':
            handleMessage("command_result", data);
            break;
          case 'files_changed':
            handleMessage("files_changed", data);
            break;
          case 'ping':
            // Respond to ping with pong
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ event: 'pong' }));
            }
            break;
          default:
            // For any other message
            handleMessage("message", data);
        }
      } catch (error) {
        console.error("Error parsing message", error);
        handleMessage("error", { message: "Failed to parse server message" });
      }
    };
    
  } catch (error) {
    console.error("Failed to connect to socket", error);
    
    // Clear timeout if it exists
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    
    handleMessage("connect_error", { message: "Failed to create WebSocket connection" });
  }
};

export const disconnectSocket = () => {
  // Clear timeout if it exists
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
    connectionTimeout = null;
  }
  
  if (socket) {
    socket.close();
    socket = null;
  }
};

export const emit = (event: string, data: any) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({
      event: event,
      data: data
    });
    
    try {
      socket.send(message);
      console.log(`Sent event: ${event}`, data);
    } catch (error) {
      console.error(`Failed to send event: ${event}`, error);
      handleMessage("error", { message: "Failed to send message" });
    }
  } else {
    console.error("Cannot emit event: socket is not connected");
    handleMessage("error", { message: "Socket is not connected" });
  }
};

export const isConnected = (): boolean => {
  return socket !== null && socket.readyState === WebSocket.OPEN;
};
