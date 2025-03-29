import React from 'react';
import { AlertTriangle, RefreshCw, Info, AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { cn } from '../lib/utils';

export interface ErrorDisplayProps {
  message: string;
  description?: string;
  type?: 'error' | 'warning' | 'info' | 'api';
  onRetry?: () => void;
  onClose?: () => void;
  className?: string;
  inline?: boolean;
  centered?: boolean;
}

/**
 * Reusable error display component that can be used across the application
 */
export const ErrorDisplay = ({
  message,
  description,
  type = 'error',
  onRetry,
  onClose,
  className,
  inline = false,
  centered = false
}: ErrorDisplayProps) => {
  // Define styles based on error type
  const styles = {
    error: {
      bgColor: 'bg-red-900/50',
      borderColor: 'border-red-500/50',
      textColor: 'text-red-200',
      iconColor: 'text-red-200',
      icon: AlertCircle,
      retryBtnVariant: 'outline' as const,
      retryBtnClass: 'border-red-500/50 text-red-200 hover:bg-red-900/50'
    },
    warning: {
      bgColor: 'bg-amber-900/50',
      borderColor: 'border-amber-500/50',
      textColor: 'text-amber-200',
      iconColor: 'text-amber-200',
      icon: AlertTriangle,
      retryBtnVariant: 'outline' as const,
      retryBtnClass: 'border-amber-500/50 text-amber-200 hover:bg-amber-900/50'
    },
    info: {
      bgColor: 'bg-blue-900/50',
      borderColor: 'border-blue-500/50',
      textColor: 'text-blue-200',
      iconColor: 'text-blue-200',
      icon: Info,
      retryBtnVariant: 'outline' as const,
      retryBtnClass: 'border-blue-500/50 text-blue-200 hover:bg-blue-900/50'
    },
    api: {
      bgColor: 'bg-gradient-to-r from-red-900/40 to-red-800/30',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-200',
      iconColor: 'text-red-200',
      icon: AlertTriangle,
      retryBtnVariant: 'outline' as const,
      retryBtnClass: 'text-red-200 border-red-500/30 hover:bg-red-500/20'
    }
  };

  const currentStyle = styles[type];
  const Icon = currentStyle.icon;

  if (inline) {
    return (
      <div className={cn(
        currentStyle.bgColor,
        'backdrop-blur-sm',
        currentStyle.borderColor,
        'border',
        'rounded-md',
        'p-3',
        'flex',
        'items-center',
        className
      )}>
        <div className={cn(
          'mr-3 p-1.5 rounded-full',
          type === 'api' ? 'bg-red-500/20' : `bg-${type === 'error' ? 'red' : type === 'warning' ? 'amber' : 'blue'}-500/20`
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className={cn('text-sm font-medium', currentStyle.textColor)}>
            {message}
          </p>
          {description && (
            <p className={cn('text-xs mt-1', `${currentStyle.textColor}/80`)}>
              {description}
            </p>
          )}
        </div>
        <div className="flex ml-3 space-x-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className={cn(currentStyle.retryBtnClass, 'h-8')}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Retry
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${currentStyle.textColor}/70 hover:${currentStyle.textColor} hover:bg-${type === 'error' ? 'red' : type === 'warning' ? 'amber' : 'blue'}-500/20`}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      currentStyle.bgColor,
      currentStyle.borderColor,
      'border',
      'shadow-lg',
      className
    )}>
      <CardContent className={cn(
        'p-6',
        centered && 'flex flex-col items-center justify-center',
        centered ? 'h-64' : 'min-h-[120px]'
      )}>
        <div className={cn('flex', centered ? 'flex-col items-center' : 'items-start')}>
          <Icon className={cn('h-8 w-8 mb-4', currentStyle.iconColor, !centered && 'mt-1 mr-4')} />
          <div className={cn(!centered && 'flex-1')}>
            <p className={cn('text-lg font-medium mb-2', currentStyle.textColor)}>{message}</p>
            {description && (
              <p className={cn('mb-4', `${currentStyle.textColor}/80`)}>
                {description}
              </p>
            )}
            {onRetry && (
              <Button
                onClick={onRetry}
                variant={currentStyle.retryBtnVariant}
                className={currentStyle.retryBtnClass}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
          {onClose && !centered && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${currentStyle.textColor}/70 hover:${currentStyle.textColor} hover:bg-${type === 'error' ? 'red' : type === 'warning' ? 'amber' : 'blue'}-500/20`}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 