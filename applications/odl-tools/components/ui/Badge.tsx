import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-900',
        primary: 'bg-primary-100 text-primary-900',
        secondary: 'bg-secondary-100 text-secondary-900',
        success: 'bg-success-100 text-success-900',
        warning: 'bg-warning-100 text-warning-900',
        danger: 'bg-danger-100 text-danger-900',
        outline: 'border border-neutral-300 bg-transparent text-neutral-900',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, dot, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={badgeVariants({ variant, size, className })}
        {...props}
      >
        {dot && (
          <span
            className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current"
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    )
  }
)

Badge.displayName = 'Badge'
