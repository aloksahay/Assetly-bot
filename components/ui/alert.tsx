import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "fixed top-4 left-1/2 transform -translate-x-1/2 rounded-lg p-4 shadow-lg border transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-white/10 backdrop-blur-md border-white/20 text-white",
        success: "bg-green-500/10 backdrop-blur-md border-green-500/20 text-green-400",
        error: "bg-red-500/10 backdrop-blur-md border-red-500/20 text-red-400",
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

interface AlertProps extends VariantProps<typeof alertVariants> {
  message: string
}

export function Alert({ message, variant }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }))}>
      {message}
    </div>
  )
} 