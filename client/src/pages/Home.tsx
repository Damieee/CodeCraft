import { useState, useEffect } from "react";
import CodeEditor from "@/components/CodeEditor";
import Terminal from "@/components/Terminal";
import Toolbar from "@/components/Toolbar";
import { useResizable } from "@/hooks/use-resizable";
import { connectToSocket, disconnectSocket, isConnected, emit } from "@/lib/socket";
import { useMobile } from "@/hooks/use-mobile";

export default function Home() {
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [language, setLanguage] = useState("python");
  const [filename, setFilename] = useState("main.py");
  const [code, setCode] = useState("# Welcome to the Code Editor\n# Connect to the WebSocket and write your code here\n# Then click the Run button to execute\n\nprint(\"Hello, World!\")\n");
  const [terminalOutput, setTerminalOutput] = useState<Array<{text: string, type: string}>>([
    { text: "Welcome to the Code Editor Terminal.", type: "output" },
    { text: "Connect to the WebSocket to start coding.", type: "output" },
  ]);
  
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

    const onConnectionEstablished = (data: any) => {
      addTerminalLine(`Connection established. Session ID: ${data.sid}`, "success");
      createProject();
    };

    const onError = (data: any) => {
      addTerminalLine(`Error: ${data.message}`, "error");
    };

    const onProjectInitializing = (data: any) => {
      addTerminalLine(`Project initializing. ID: ${data.project_id}`, "output");
    };

    const onProjectReady = (data: any) => {
      setProjectId(data.project_id);
      addTerminalLine(`Project ready. ID: ${data.project_id}`, "success");
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
        addTerminalLine(`File ${data.args.filename} saved successfully`, "success");
      }
    };

    // Setup socket event listeners
    window.addEventListener('socket:connect', onSocketConnect);
    window.addEventListener('socket:disconnect', onSocketDisconnect);
    window.addEventListener('socket:connection_established', (e: any) => onConnectionEstablished(e.detail));
    window.addEventListener('socket:error', (e: any) => onError(e.detail));
    window.addEventListener('socket:project_initializing', (e: any) => onProjectInitializing(e.detail));
    window.addEventListener('socket:project_ready', (e: any) => onProjectReady(e.detail));
    window.addEventListener('socket:command_result', (e: any) => onCommandResult(e.detail));

    return () => {
      window.removeEventListener('socket:connect', onSocketConnect);
      window.removeEventListener('socket:disconnect', onSocketDisconnect);
      window.removeEventListener('socket:connection_established', (e: any) => onConnectionEstablished(e.detail));
      window.removeEventListener('socket:error', (e: any) => onError(e.detail));
      window.removeEventListener('socket:project_initializing', (e: any) => onProjectInitializing(e.detail));
      window.removeEventListener('socket:project_ready', (e: any) => onProjectReady(e.detail));
      window.removeEventListener('socket:command_result', (e: any) => onCommandResult(e.detail));
    };
  }, []);

  const handleConnect = () => {
    if (isSocketConnected) {
      // Disconnect
      disconnectSocket();
      setIsSocketConnected(false);
      setIsConnecting(false);
      setProjectId(null);
    } else {
      // Connect
      setIsConnecting(true);
      addTerminalLine("Connecting to WebSocket server...", "output");
      connectToSocket();
    }
  };

  const createProject = () => {
    const projectData = {
      type: 'base',
      id: `project-${Date.now()}`
    };
    
    emit('create_project', projectData);
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
    if (!isSocketConnected || !projectId) {
      addTerminalLine('Not connected to a project', 'error');
      return;
    }

    if (!filename) {
      addTerminalLine('Please enter a filename', 'error');
      return;
    }

    // First save the file
    emit('project_command', {
      command: 'save_file',
      args: {
        filename: filename,
        content: code
      }
    });

    addTerminalLine(`Saving file: ${filename}`, 'output');

    // Then run the code
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    let runCommand = '';

    if (extension === 'py') {
      runCommand = `python ${filename}`;
    } else if (extension === 'java') {
      const className = filename.replace('.java', '');
      runCommand = `javac ${filename} && java ${className}`;
    } else if (extension === 'js') {
      runCommand = `node ${filename}`;
    } else {
      addTerminalLine(`Unsupported file type: ${extension}`, 'error');
      return;
    }

    addTerminalLine(`Running: ${runCommand}`, 'command');

    emit('project_command', {
      command: 'terminal_input',
      args: {
        input: runCommand
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

    // Send the command to server
    emit('project_command', {
      command: 'terminal_input',
      args: {
        input: input
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
