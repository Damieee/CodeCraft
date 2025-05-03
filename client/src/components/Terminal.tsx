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

  // Auto-scroll to the bottom when output changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [output]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      // Send command
      onInput(inputValue);
      
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
        <Button 
          variant="outline" 
          size="sm" 
          className="h-6 px-2 text-xs bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
      
      <div className="flex-grow flex flex-col">
        <ScrollArea 
          ref={scrollAreaRef as any}
          className="flex-grow terminal overflow-y-auto no-scrollbar"
        >
          {output.map(renderTerminalLine)}
        </ScrollArea>
        
        <div className="terminal-input-container flex items-center p-2 border-t border-slate-700 bg-gray-900">
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
