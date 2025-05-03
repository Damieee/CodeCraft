import io from "socket.io-client";

let socket: any = null;

// When we receive messages from the server, dispatch custom events
const handleMessage = (eventName: string, data: any) => {
  const event = new CustomEvent(`socket:${eventName}`, { detail: data });
  window.dispatchEvent(event);
};

export const connectToSocket = () => {
  if (socket && socket.connected) return;
  
  try {
    // Connect to the external WebSocket server
    socket = io('ws://3.131.13.46:8000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    // Register global event handlers
    socket.on('connect', () => {
      console.log("Socket connected");
      handleMessage("connect", null);
    });
    
    socket.on('disconnect', () => {
      console.log("Socket disconnected");
      handleMessage("disconnect", null);
    });
    
    socket.on('connection_established', (data: any) => {
      console.log("Connection established", data);
      handleMessage("connection_established", data);
    });
    
    socket.on('error', (data: any) => {
      console.error("Socket error", data);
      handleMessage("error", data);
    });
    
    socket.on('project_initializing', (data: any) => {
      console.log("Project initializing", data);
      handleMessage("project_initializing", data);
    });
    
    socket.on('project_ready', (data: any) => {
      console.log("Project ready", data);
      handleMessage("project_ready", data);
    });
    
    socket.on('project_error', (data: any) => {
      console.error("Project error", data);
      handleMessage("project_error", data);
    });
    
    socket.on('command_result', (data: any) => {
      console.log("Command result", data);
      handleMessage("command_result", data);
    });
    
    socket.on('files_changed', (data: any) => {
      console.log("Files changed", data);
      handleMessage("files_changed", data);
    });
    
  } catch (error) {
    console.error("Failed to connect to socket", error);
    handleMessage("connect_error", { error });
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emit = (event: string, data: any) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.error("Cannot emit event: socket is not connected");
    handleMessage("error", { message: "Socket is not connected" });
  }
};

export const isConnected = (): boolean => {
  return socket !== null && socket.connected;
};
