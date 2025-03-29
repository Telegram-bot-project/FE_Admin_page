import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A class component that catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  /**
   * Update state so the next render will show the fallback UI.
   */
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  /**
   * Log the error to an error reporting service
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You could also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback;
    }

    return this.props.children;
  }
} 