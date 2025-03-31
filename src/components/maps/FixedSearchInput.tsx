import React, { forwardRef, useState, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface FixedSearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const FixedSearchInput = forwardRef<HTMLInputElement, FixedSearchInputProps>(
  ({ className = "", onClear, isLoading, leftIcon, value, onChange, onFocus, onBlur, ...props }, ref) => {
    // Track internal state and focus
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [internalValue, setInternalValue] = useState(value || "");
    
    // Key debugging functions
    const logDebug = (message: string) => {
      console.log(`[FixedInput] ${message}`);
      if (typeof window !== 'undefined' && (window as any).goongMapsDebug?.logInput) {
        (window as any).goongMapsDebug.logInput(`[Input] ${message}`);
      }
    };
    
    // Sync internal value with external value prop
    useEffect(() => {
      if (value !== undefined && value !== internalValue) {
        logDebug(`External value updated: "${value}"`);
        setInternalValue(value);
      }
    }, [value, internalValue]);
    
    // Merge provided ref with our local ref
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(inputRef.current);
        } else {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = inputRef.current;
        }
      }
    }, [ref]);

    // Process change events carefully
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      logDebug(`Change event: "${newValue}"`);
      
      // Update internal state immediately
      setInternalValue(newValue);
      
      // Call parent onChange handler
      if (onChange) {
        onChange(e);
      }
    };

    // Enhanced focus handler
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      logDebug('Focus event');
      setIsFocused(true);
      if (onFocus) {
        onFocus(e);
      }
    };

    // Critical: Prevent blur entirely
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Check if the related target is within our component
      const relatedTarget = e.relatedTarget as Node;
      const container = containerRef.current;
      
      if (container && !container.contains(relatedTarget)) {
        logDebug('External blur event - allowing blur');
        setIsFocused(false);
        if (onBlur) {
          onBlur(e);
        }
      } else {
        // This is the key fix: prevent blur when clicking within our component
        logDebug('Internal blur prevented');
        e.preventDefault();
        // Re-focus immediately
        setTimeout(() => {
          if (inputRef.current) {
            logDebug('Re-focusing input');
            inputRef.current.focus();
          }
        }, 0);
      }
    };
    
    // Handle clear button click without losing focus
    const handleClearClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      logDebug('Clear button clicked');
      
      // Update internal state
      setInternalValue("");
      
      // Create a synthetic event for onChange
      if (onChange && inputRef.current) {
        const syntheticEvent = {
          target: {
            value: ""
          }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      
      // Call separate onClear if provided
      if (onClear) {
        onClear();
      }
      
      // Critical: Keep focus on input after clearing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    };
    
    // Handle container click to focus input
    const handleContainerClick = () => {
      logDebug('Container clicked');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    // Ensure we focus on mount if autofocus is set
    useEffect(() => {
      if (props.autoFocus && inputRef.current) {
        logDebug('Auto focusing input');
        inputRef.current.focus();
      }
    }, [props.autoFocus]);
    
    return (
      <div 
        className={`relative w-full ${className}`}
        ref={containerRef}
      >
        <div 
          className={`
            flex items-center w-full rounded-md bg-white/5 border border-white/10 
            px-3 py-2 h-10 transition-all duration-200
            ${isFocused ? 'ring-1 ring-indigo-500/50 border-indigo-500/30' : ''}
          `}
          onClick={handleContainerClick}
        >
          {leftIcon || (
            <Search className="h-4 w-4 text-white/40 mr-2 flex-shrink-0" />
          )}
          
          <input
            ref={inputRef}
            {...props}
            value={internalValue}
            onChange={handleChange}
            className="
              flex-1 bg-transparent border-0 outline-none p-0 text-white
              placeholder:text-white/40 focus:outline-none focus:ring-0
              disabled:cursor-not-allowed disabled:opacity-50
            "
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400 ml-2 flex-shrink-0" />
          )}
          
          {internalValue && onClear && (
            <button
              type="button"
              onMouseDown={(e) => {
                // Prevent blur during mousedown
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleClearClick}
              className="ml-2 text-white/40 hover:text-white/70 p-1 rounded-full hover:bg-white/10"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

FixedSearchInput.displayName = 'FixedSearchInput';

export default FixedSearchInput; 