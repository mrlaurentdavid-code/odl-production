'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'

interface BackToDashboardProps {
  variant?: 'link' | 'button'
  className?: string
}

export function BackToDashboard({ variant = 'link', className = '' }: BackToDashboardProps) {
  const baseClasses = 'inline-flex items-center gap-2 font-medium transition-colors'

  if (variant === 'link') {
    return (
      <Link
        href="/dashboard"
        className={`${baseClasses} text-sm text-primary-600 hover:text-primary-700 ${className}`}
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Link>
    )
  }

  // variant === 'button'
  return (
    <Link
      href="/dashboard"
      className={`${baseClasses} px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 text-sm ${className}`}
    >
      <Home className="w-4 h-4" />
      Dashboard
    </Link>
  )
}
