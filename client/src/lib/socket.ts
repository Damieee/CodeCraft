import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

// For debug purposes
const EXTERNAL_WS_URL = 'ws://3.131.13.46:8000';
const LOCAL_DEBUG_WS_URL = window.location.protocol === 'https:' 
  ? `${window.location.origin}/debug-ws`
  : `${window.location.origin}/debug-ws`;

export function isConnected() {
  return socket !== null && socket.connected;
}

export function connectToSocket() {
  if (socket) {
    return;
  }

  try {
    // Using Socket.IO client instead of raw WebSocket
    socket = io(EXTERNAL_WS_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 3,
      timeout: 10000
    });
    
    socket.on('connect', () => {
      console.log('Socket connected, sid =', socket.id);
      dispatchEvent('socket:connect', {});
      dispatchEvent('socket:connection_established', { sid: socket.id });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected. Reason:', reason);
      dispatchEvent('socket:disconnect', { reason });
      socket = null;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      dispatchEvent('socket:connect_error', { message: error.message });
    });

    // Socket.IO specific events from the test script
    socket.on('project_initializing', (data) => {
      dispatchEvent('socket:project_initializing', data);
    });

    socket.on('project_ready', (data) => {
      dispatchEvent('socket:project_ready', data);
    });

    socket.on('command_result', (data) => {
      dispatchEvent('socket:command_result', data);
    });

    socket.on('terminalResponse', (data) => {
      dispatchEvent('socket:command_result', {
        command: 'terminal_input',
        result: {
          output: data.data
        }
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      dispatchEvent('socket:error', { message: error.message || 'Unknown error' });
    });
    
  } catch (e) {
    console.error('Error initializing socket:', e);
    dispatchEvent('socket:connect_error', { message: String(e) });
  }
}

export function connectToLocalDebugSocket() {
  if (socket) {
    return;
  }

  try {
    console.log('Connecting to local debug WebSocket at:', LOCAL_DEBUG_WS_URL);
    
    socket = io(LOCAL_DEBUG_WS_URL, {
      transports: ['websocket'],
      path: '/debug-ws', // This path matches your server setup
      reconnectionAttempts: 3
    });
    
    socket.on('connect', () => {
      console.log('Local debug socket connected');
      dispatchEvent('socket:connect', {});
      dispatchEvent('socket:connection_established', { sid: socket.id });
    });

    socket.on('disconnect', (reason) => {
      console.log('Local debug socket disconnected. Reason:', reason);
      dispatchEvent('socket:disconnect', { reason });
      socket = null;
    });

    socket.on('connect_error', (error) => {
      console.error('Local debug socket error:', error);
      dispatchEvent('socket:connect_error', { message: error.message });
    });

    // Standard events
    socket.on('project_initializing', (data) => {
      dispatchEvent('socket:project_initializing', data);
    });

    socket.on('project_ready', (data) => {
      dispatchEvent('socket:project_ready', data);
    });

    socket.on('command_result', (data) => {
      dispatchEvent('socket:command_result', data);
    });

    socket.on('terminalResponse', (data) => {
      dispatchEvent('socket:command_result', {
        command: 'terminal_input',
        result: {
          output: data.data
        }
      });
    });
    
    // Debug server events
    socket.on('debug_echo', (data) => {
      console.log('Debug echo received:', data);
      dispatchEvent('socket:message', data);
    });
    
  } catch (e) {
    console.error('Error initializing local debug socket:', e);
    dispatchEvent('socket:connect_error', { message: String(e) });
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emit(eventName: string, data: any) {
  if (!socket || !socket.connected) {
    console.error('Socket not connected');
    dispatchEvent('socket:error', { message: 'Socket not connected' });
    return false;
  }

  try {
    // For Socket.IO, we can directly emit events
    socket.emit(eventName, data);
    return true;
  } catch (e) {
    console.error('Error sending message:', e);
    dispatchEvent('socket:error', { message: String(e) });
    return false;
  }
}

function dispatchEvent(eventName: string, data: any) {
  const event = new CustomEvent(eventName, { detail: data });
  window.dispatchEvent(event);
}
