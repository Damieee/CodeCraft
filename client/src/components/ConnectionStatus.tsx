import { Button } from "@/components/ui/button";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnectClick: () => void;
}

export default function ConnectionStatus({
  isConnected,
  isConnecting,
  onConnectClick
}: ConnectionStatusProps) {
  let statusClass = "status-disconnected";
  let statusText = "Disconnected";
  
  if (isConnected) {
    statusClass = "status-connected";
    statusText = "Connected";
  } else if (isConnecting) {
    statusClass = "status-connecting";
    statusText = "Connecting...";
  }
  
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        <span className={`status-indicator ${statusClass} mr-2`}></span>
        <span className="text-sm">{statusText}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onConnectClick}
        className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 h-8"
      >
        {isConnected ? "Disconnect" : "Connect"}
      </Button>
    </div>
  );
}
