import { useState, useEffect } from "react";
import CodeEditor from "@/components/CodeEditor";
import Terminal from "@/components/Terminal";
import Toolbar from "@/components/Toolbar";
import { useResizable } from "@/hooks/use-resizable";
import { connectToSocket, disconnectSocket, isConnected, emit, connectToLocalDebugSocket } from "@/lib/socket";
import { useMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [language, setLanguage] = useState("python");
  const [filename, setFilename] = useState("main.py");
  const [code, setCode] = useState("# Welcome to LTD Code Editor\n# Connect to the WebSocket and write your code here\n# Then click the Run button to execute\n\nprint(\"Hello, World!\")\n");
  const [terminalOutput, setTerminalOutput] = useState<Array<{text: string, type: string}>>([
    { text: "Welcome to LTD Code Editor Terminal.", type: "output" },
    { text: "Connect to the WebSocket to start coding.", type: "output" },
  ]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const isMobile = useMobile();
  
  // Terminal height with resizer
  const { 
    elementRef: terminalContainerRef, 
    size: terminalHeight, 
    handleResizeStart 
  } = useResizable({ initialSize: 200, minSize: 100, maxSize: 500, direction: 'vertical' });

  useEffect(() => {
    const onSocketConnect = () => {
      setIsSocketConnected(true);
      setIsConnecting(false);
      addTerminalLine("Connected to WebSocket server", "success");
    };

    const onSocketDisconnect = () => {
      setIsSocketConnected(false);
      setIsConnecting(false);
      setProjectId(null);
      addTerminalLine("Disconnected from WebSocket server", "error");
    };
    
    const onConnectError = (data: any) => {
      setIsSocketConnected(false);
      setIsConnecting(false);
      
      // If we fail to connect to the external server, try the local debug server
      if (!projectId && connectionAttempts < 2) {
        setConnectionAttempts(prev => prev + 1);
        addTerminalLine("Connection to external server failed. Trying local debug server...", "warning");
        connectToLocalDebugSocket();
      } else {
        setProjectId(null);
        addTerminalLine(`Connection error: ${data.message || 'Failed to connect'}`, "error");
      }
    };

    const onConnectionEstablished = (data: any) => {
      addTerminalLine(`Connection established. Session ID: ${data.sid || 'unknown'}`, "success");
      createProject();
    };

    const onError = (data: any) => {
      addTerminalLine(`Error: ${data.message || 'Unknown error'}`, "error");
      if (data.message?.includes('not connected')) {
        setIsSocketConnected(false);
        setIsConnecting(false);
      }
    };

    const onProjectInitializing = (data: any) => {
      addTerminalLine(`Project initializing. ID: ${data.project_id || 'unknown'}`, "output");
    };

    const onProjectReady = (data: any) => {
      setProjectId(data.project_id);
      addTerminalLine(`Project ready. ID: ${data.project_id || 'unknown'}`, "success");
    };

    const onCommandResult = (data: any) => {
      if (data.command === 'terminal_input') {
        if (data.result && data.result.output) {
          addTerminalLine(data.result.output, "output");
        }
      } else if (data.command === 'run_code') {
        if (data.result && data.result.output) {
          addTerminalLine(data.result.output, "output");
        }
      } else if (data.command === 'save_file') {
        addTerminalLine(`File ${data.args?.filename || 'unknown'} saved successfully`, "success");
      }
    };
    
    const onMessage = (e: any) => {
      // Handle any generic messages
      console.log("Generic message received", e.detail);
      if (typeof e.detail === 'string') {
        addTerminalLine(e.detail, "output");
      } else if (e.detail && e.detail.message) {
        addTerminalLine(e.detail.message, "output");
      }
    };

    // Setup socket event listeners
    window.addEventListener('socket:connect', onSocketConnect);
    window.addEventListener('socket:disconnect', onSocketDisconnect);
    window.addEventListener('socket:connect_error', onConnectError);
    window.addEventListener('socket:connection_established', (e: any) => onConnectionEstablished(e.detail));
    window.addEventListener('socket:error', (e: any) => onError(e.detail));
    window.addEventListener('socket:project_initializing', (e: any) => onProjectInitializing(e.detail));
    window.addEventListener('socket:project_ready', (e: any) => onProjectReady(e.detail));
    window.addEventListener('socket:command_result', (e: any) => onCommandResult(e.detail));
    window.addEventListener('socket:message', (e: any) => onMessage(e));

    return () => {
      window.removeEventListener('socket:connect', onSocketConnect);
      window.removeEventListener('socket:disconnect', onSocketDisconnect);
      window.removeEventListener('socket:connect_error', onConnectError);
      window.removeEventListener('socket:connection_established', (e: any) => onConnectionEstablished(e.detail));
      window.removeEventListener('socket:error', (e: any) => onError(e.detail));
      window.removeEventListener('socket:project_initializing', (e: any) => onProjectInitializing(e.detail));
      window.removeEventListener('socket:project_ready', (e: any) => onProjectReady(e.detail));
      window.removeEventListener('socket:command_result', (e: any) => onCommandResult(e.detail));
      window.removeEventListener('socket:message', (e: any) => onMessage(e));
    };
  }, [connectionAttempts]);

  const handleConnect = () => {
    if (isSocketConnected) {
      // Disconnect
      disconnectSocket();
      setIsSocketConnected(false);
      setIsConnecting(false);
      setProjectId(null);
      setConnectionAttempts(0);
      addTerminalLine("Disconnected from WebSocket server", "output");
    } else {
      // Connect
      setIsConnecting(true);
      setConnectionAttempts(0);
      setTerminalOutput([{ text: "Terminal cleared", type: "output" }]);
      addTerminalLine("Connecting to WebSocket server at ws://3.131.13.46:8000...", "output");
      addTerminalLine("Using Socket.IO protocol with WebSocket transport", "output");
      connectToSocket();
      
      // Add a timeout to help the user understand what's happening if the connection fails
      setTimeout(() => {
        if (!isSocketConnected && isConnecting) {
          addTerminalLine("Still trying to connect... If external server is not accessible, we'll attempt to use local debug server.", "output");
        }
      }, 5000);
    }
  };

  const createProject = () => {
    // For Socket.IO, we directly emit the event without wrapping it
    emit('create_project', { type: 'base' });
    addTerminalLine(`Creating new project...`, "output");
  };

  const addTerminalLine = (text: string, type: string = "output") => {
    setTerminalOutput(prev => [...prev, { text, type }]);
  };

  const clearTerminal = () => {
    setTerminalOutput([{ text: "Terminal cleared", type: "output" }]);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    
    // Update filename extension based on language
    const baseName = filename.split('.')[0] || 'main';
    let extension = 'txt';
    
    switch(newLanguage) {
      case 'python':
        extension = 'py';
        break;
      case 'java':
        extension = 'java';
        break;
      case 'javascript':
        extension = 'js';
        break;
      case 'html':
        extension = 'html';
        break;
      case 'css':
        extension = 'css';
        break;
      default:
        extension = 'txt';
    }
    
    setFilename(`${baseName}.${extension}`);
  };

  const handleRunCode = () => {
    console.log("is socket connected", isSocketConnected)
    console.log("project id", projectId)
    console.log("file name", filename)
    
    if (!isSocketConnected || !projectId) {
      addTerminalLine('Not connected to a project', 'error');
      return;
    }

    if (!filename) {
      addTerminalLine('Please enter a filename', 'error');
      return;
    }

    // For Socket.IO, we need to use the correct event name and structure
    emit('project_command', {
      command: 'saveFile',
      args: {
        path: `/home/user/project/${filename}`,
        content: code
      }
    });

    addTerminalLine(`Saving file: ${filename}`, 'output');

    // Then run the code
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    let runCommand = '';

    if (extension === 'py') {
      runCommand = `python /home/user/project/${filename}`;
    } else if (extension === 'java') {
      const className = filename.replace('.java', '');
      runCommand = `javac /home/user/project/${filename} && java -cp /home/user/project ${className}`;
    } else if (extension === 'js') {
      runCommand = `node /home/user/project/${filename}`;
    } else {
      addTerminalLine(`Unsupported file type: ${extension}`, 'error');
      return;
    }

    addTerminalLine(`Running: ${runCommand}`, 'command');

    // Send the run command
    emit('project_command', {
      command: 'runCommand',
      args: {
        terminal_id: `term_${projectId}`,
        command: runCommand
      }
    });
  };

  const handleTerminalInput = (input: string) => {
    if (!isSocketConnected || !projectId) {
      addTerminalLine('Not connected to a project', 'error');
      return;
    }

    // Add command to terminal display
    addTerminalLine(`$ ${input}`, 'command');

    // Send the command to server using Socket.IO format
    emit('project_command', {
      command: 'runCommand',
      args: {
        terminal_id: `term_${projectId}`,
        command: input
      }
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <Toolbar
        language={language}
        filename={filename}
        isConnected={isSocketConnected}
        isConnecting={isConnecting}
        onLanguageChange={handleLanguageChange}
        onFilenameChange={setFilename}
        onRunClick={handleRunCode}
        onConnectClick={handleConnect}
      />

      <div className="flex-grow flex flex-col overflow-hidden">
        {/* Editor Container */}
        <div 
          className="flex-grow overflow-hidden min-h-[100px]"
          style={{ height: `calc(100% - ${terminalHeight}px)` }}
        >
          <CodeEditor 
            language={language}
            value={code}
            onChange={setCode}
          />
        </div>
        
        {/* Resizer */}
        <div 
          className="h-[10px] cursor-row-resize bg-slate-800 border-t border-b border-slate-700 flex justify-center items-center"
          onMouseDown={handleResizeStart}
        >
          <div className="w-10 h-1 bg-slate-600 rounded"></div>
        </div>
        
        {/* Terminal Container */}
        <div 
          ref={terminalContainerRef}
          className="bg-gray-900 overflow-hidden flex flex-col"
          style={{ height: `${terminalHeight}px` }}
        >
          <Terminal
            output={terminalOutput}
            onInput={handleTerminalInput}
            onClear={clearTerminal}
          />
        </div>
      </div>
    </div>
  );
}
