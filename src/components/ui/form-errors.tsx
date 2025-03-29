import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ErrorDisplay } from '../ErrorDisplay';

interface FormErrorsProps {
  errors?: string[] | string;
  className?: string;
  inline?: boolean;
}

/**
 * Form errors component to display validation errors consistently
 */
export const FormErrors = ({ errors, className, inline = true }: FormErrorsProps) => {
  if (!errors || (Array.isArray(errors) && errors.length === 0)) {
    return null;
  }

  // Convert string error to array
  const errorArray = Array.isArray(errors) ? errors : [errors];

  if (inline) {
    return (
      <div className={cn('mt-1.5', className)}>
        {errorArray.map((error, index) => (
          <div
            key={index}
            className="flex items-start text-red-400 text-xs mt-0.5 first:mt-0"
          >
            <AlertCircle className="h-3 w-3 mt-0.5 mr-1.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ))}
      </div>
    );
  }

  // For more prominent errors, use the ErrorDisplay component
  return (
    <ErrorDisplay
      message={errorArray.length > 1 ? 'Please fix the following errors:' : errorArray[0]}
      description={errorArray.length > 1 ? errorArray.join(' • ') : undefined}
      type="error"
      inline
      className={className}
    />
  );
};

/**
 * Form success component for validation success messages
 */
export const FormSuccess = ({ message, className }: { message: string; className?: string }) => {
  if (!message) return null;

  return (
    <div className={cn(
      'bg-emerald-900/30 text-emerald-200 border border-emerald-500/30 rounded-md px-3 py-2 text-sm flex items-center',
      className
    )}>
      <div className="bg-emerald-500/20 p-1 rounded-full mr-2">
        <AlertTriangle className="h-3 w-3" />
      </div>
      {message}
    </div>
  );
}; 