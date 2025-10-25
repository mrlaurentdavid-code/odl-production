'use client'

import React from 'react'
import { Card } from './Card'
import { Badge } from './Badge'
import { cn } from '@/lib/utils'

export interface AppCardProps {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  url: string
  available: boolean
  gradient?: string
  stats?: {
    label: string
    value: string | number
  }[]
  badge?: {
    label: string
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  }
}

export const AppCard: React.FC<AppCardProps> = ({
  title,
  description,
  icon,
  url,
  available,
  gradient,
  stats,
  badge,
}) => {
  const handleClick = () => {
    if (available) {
      window.location.href = url
    }
  }

  return (
    <Card
      variant="interactive"
      padding="none"
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        available
          ? 'hover:scale-[1.02] cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      )}
      onClick={handleClick}
    >
      {/* Gradient Header - Plus compact */}
      <div className={cn('relative h-32', gradient || 'bg-gradient-to-br from-primary-500 to-primary-700')}>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        {/* Icon - Centré et plus petit */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/90 transition-transform duration-300 group-hover:scale-110">
            {icon}
          </div>
        </div>

        {/* Badge si indisponible */}
        {!available && (
          <div className="absolute top-3 right-3">
            <Badge variant="outline" size="sm" className="bg-white/20 backdrop-blur-sm text-white border-white/30">
              Bientôt
            </Badge>
          </div>
        )}

        {/* Badge personnalisé */}
        {badge && available && (
          <div className="absolute top-3 right-3">
            <Badge variant={badge.variant} size="sm">
              {badge.label}
            </Badge>
          </div>
        )}
      </div>

      {/* Content - Plus d'info, moins d'espace */}
      <div className="p-4 space-y-3">
        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="font-semibold text-lg text-neutral-900 line-clamp-1">
            {title}
          </h3>
          <p className="text-sm text-neutral-600 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Stats si présentes */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-4 pt-2 border-t border-neutral-100">
            {stats.map((stat, index) => (
              <div key={index} className="flex-1">
                <div className="text-xs text-neutral-500">{stat.label}</div>
                <div className="text-base font-semibold text-neutral-900">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Hover indicator */}
        {available && (
          <div className="flex items-center justify-end text-sm text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Ouvrir</span>
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </Card>
  )
}
