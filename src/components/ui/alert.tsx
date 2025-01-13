import * as React from "react"
import { cn } from "@/lib/utils"

interface AlertProps {
  message: string;
  variant?: 'success' | 'error';
}

export function Alert({ message, variant = 'success' }: AlertProps) {
  return (
    <div className={cn(
      "fixed bottom-4 right-4 p-4 rounded-lg shadow-lg",
      "animate-in slide-in-from-right",
      variant === 'success' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
      "bg-red-500/10 text-red-400 border border-red-500/20"
    )}>
      {message}
    </div>
  )
} 