import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface TerminalProps {
  output: Array<{ text: string; type: string }>;
  onInput: (input: string) => void;
  onClear: () => void;
}

export default function Terminal({ output, onInput, onClear }: TerminalProps) {
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);

  // Auto-scroll to the bottom when output changes, but only if autoScroll is true
  useEffect(() => {
    if (scrollAreaRef.current && autoScroll) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [output, autoScroll]);

  // Handle user scrolling to disable auto-scroll
  const handleScroll = () => {
    if (!scrollAreaRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const isScrolledToBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    
    if (!isScrolledToBottom && !userScrolled) {
      setUserScrolled(true);
      setAutoScroll(false);
    } else if (isScrolledToBottom && userScrolled) {
      setUserScrolled(false);
      setAutoScroll(true);
    }
  };

  // Re-enable auto-scroll when user sends a command
  const handleSendCommand = (cmd: string) => {
    onInput(cmd);
    setAutoScroll(true);
    setUserScrolled(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      // Send command
      handleSendCommand(inputValue);
      
      // Add to history
      setCommandHistory(prev => [inputValue, ...prev.slice(0, 49)]);
      setHistoryIndex(-1);
      
      // Clear input
      setInputValue('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  };

  // Helper function to render terminal lines with appropriate styling
  const renderTerminalLine = (line: { text: string; type: string }, index: number) => {
    return (
      <div key={index} className="terminal-line py-0.5">
        <span className={`terminal-${line.type}`}>{line.text}</span>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-between items-center bg-slate-800 px-3 py-1 border-t border-b border-slate-700">
        <div className="text-sm font-medium">Terminal</div>
        <div className="flex space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs hover:bg-slate-600 text-slate-300"
            onClick={() => {
              setAutoScroll(true);
              setUserScrolled(false);
              if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
              }
            }}
          >
            Scroll to Bottom
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-6 px-2 text-xs bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col h-full" style={{ height: 'calc(100% - 33px)' }}>
        <div 
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="overflow-y-auto terminal px-2 py-1 bg-gray-900"
          style={{ 
            height: 'calc(100% - 40px)', 
            overflowY: 'auto',
            position: 'relative'
          }}
        >
          <div>
            {output.map(renderTerminalLine)}
          </div>
        </div>
        
        <div className="terminal-input-container flex items-center p-2 border-t border-slate-700 bg-gray-900"
             style={{ height: '40px', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <span className="terminal-prompt mr-2">$</span>
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="terminal-input bg-transparent border-none text-slate-50 font-mono text-sm outline-none flex-grow" 
            placeholder="Type commands here..." 
          />
        </div>
      </div>
    </>
  );
}
