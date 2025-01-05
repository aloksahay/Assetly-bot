import { useEffect, useRef } from 'react'

interface Log {
  message: string
  timestamp: string
  type?: 'info' | 'error' | 'success'
}

interface TerminalProps {
  logs: Log[]
}

export function Terminal({ logs }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="fixed top-20 right-4 w-96 h-[calc(100vh-6rem)] bg-black/90 backdrop-blur-md rounded-lg border border-white/10 shadow-2xl overflow-hidden">
      <div className="flex items-center px-4 py-2 bg-gray-900/50 border-b border-white/10">
        <h3 className="text-sm font-mono text-gray-300">Terminal</h3>
      </div>
      <div 
        ref={terminalRef}
        className="p-4 h-full overflow-auto font-mono text-sm"
      >
        {logs.map((log, idx) => (
          <div key={idx} className="mb-2">
            <span className="text-gray-500">[{log.timestamp}]</span>{' '}
            <span className={`
              ${log.type === 'error' ? 'text-red-400' : ''}
              ${log.type === 'success' ? 'text-green-400' : ''}
              ${!log.type ? 'text-gray-300' : ''}
            `}>
              {log.message}
            </span>
          </div>
        ))}
        <div className="animate-pulse text-green-400">▊</div>
      </div>
    </div>
  )
} 