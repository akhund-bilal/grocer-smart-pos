import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statsCardVariants = cva(
  "relative p-6 rounded-lg shadow-card transition-all duration-300 hover:shadow-float",
  {
    variants: {
      variant: {
        default: "bg-card border border-border",
        primary: "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground",
        secondary: "bg-gradient-to-br from-secondary to-secondary-glow text-secondary-foreground",
        success: "bg-gradient-to-br from-success to-success/80 text-success-foreground",
        warning: "bg-gradient-to-br from-warning to-warning/80 text-warning-foreground",
        destructive: "bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface StatsCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statsCardVariants> {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label: string
  }
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ className, variant, title, value, subtitle, icon, trend, ...props }, ref) => {
    return (
      <div
        className={cn(statsCardVariants({ variant, className }))}
        ref={ref}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs opacity-70">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="opacity-80">
              {icon}
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-xs">
            <span className={cn(
              "font-medium",
              trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : "opacity-60"
            )}>
              {trend.value > 0 ? "+" : ""}{trend.value}%
            </span>
            <span className="ml-1 opacity-70">{trend.label}</span>
          </div>
        )}
      </div>
    )
  }
)

StatsCard.displayName = "StatsCard"

export { StatsCard, statsCardVariants }