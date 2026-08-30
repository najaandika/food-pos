'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{ padding: '20px', color: 'var(--danger)', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', margin: '16px' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>Something went wrong</h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>{this.state.error?.message ?? 'Unexpected error'}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              style={{ marginTop: '12px', border: 0, borderRadius: 'var(--radius-sm)', background: 'var(--blue)', color: '#fff', padding: '8px 14px', fontWeight: 700 }}
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
