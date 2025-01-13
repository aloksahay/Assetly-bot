import { cn } from "@/lib/utils"

interface TerminalProps {
  logs: Array<{
    message: string;
    timestamp: string;
    type?: 'info' | 'error' | 'success';
  }>;
}

export function Terminal({ logs }: TerminalProps) {
  return (
    <div className="fixed right-4 top-20 w-96 bg-black text-white font-mono text-sm overflow-hidden rounded-lg border border-[#1a1a1a] shadow-2xl h-[calc(100vh-6rem)]">
      {/* Terminal Header */}
      <div className="bg-[#0f1c2e] px-4 py-2 border-b border-[#1a1a1a]">
        <h3 className="text-sm font-medium text-gray-300">Terminal</h3>
      </div>
      
      {/* Terminal Content */}
      <div className="p-4 overflow-y-auto h-[calc(100%-2.5rem)]">
        {logs.map((log, idx) => (
          <div key={idx} className={cn(
            "py-0.5",
            log.type === 'error' && "text-red-400",
            log.type === 'success' && "text-green-400"
          )}>
            <span className="opacity-50">[{log.timestamp}]</span> {log.message}
          </div>
        ))}
        
        {/* Blinking Cursor */}
        <div className="mt-2 inline-block w-2 h-4 bg-gray-400 animate-blink" />
      </div>

      <style jsx global>{`
        @keyframes blink {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
} 