import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ConnectionStatus from "@/components/ConnectionStatus";
import { PlayCircle } from "lucide-react";

interface ToolbarProps {
  language: string;
  filename: string;
  isConnected: boolean;
  isConnecting: boolean;
  onLanguageChange: (language: string) => void;
  onFilenameChange: (filename: string) => void;
  onRunClick: () => void;
  onConnectClick: () => void;
}

export default function Toolbar({
  language,
  filename,
  isConnected,
  isConnecting,
  onLanguageChange,
  onFilenameChange,
  onRunClick,
  onConnectClick
}: ToolbarProps) {
  return (
    <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-white">LTD Code Editor</h1>
        
        {/* Language Selector */}
        <Select
          value={language}
          onValueChange={onLanguageChange}
        >
          <SelectTrigger className="w-[120px] h-8 bg-slate-700 text-white border-slate-600 text-sm">
            <SelectValue placeholder="Select Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="java">Java</SelectItem>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="css">CSS</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Filename Input */}
        <div className="flex items-center">
          <Input
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            className="h-8 bg-slate-700 text-white border-slate-600 text-sm w-40"
            placeholder="filename.py"
          />
        </div>
        
        {/* Run Button */}
        <Button
          onClick={onRunClick}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium h-8 px-4 text-sm flex items-center"
        >
          <PlayCircle className="h-4 w-4 mr-1" />
          Run
        </Button>
      </div>
      
      {/* Connection Status */}
      <ConnectionStatus 
        isConnected={isConnected} 
        isConnecting={isConnecting} 
        onConnectClick={onConnectClick} 
      />
    </div>
  );
}
