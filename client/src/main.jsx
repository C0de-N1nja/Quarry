import React from 'react';
import ReactDOM from 'react-dom/client';
import { RiAlertLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import App from './App';
import '../styles/globals.css';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090a0f] text-white p-6 flex flex-col items-center justify-center font-sans">
          <div className="max-w-xl w-full bg-[#131622] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <RiAlertLine className="size-6 shrink-0" />
              <h2 className="text-lg font-bold">Client Hunter OS Exception Caught</h2>
            </div>
            <p className="text-xs text-text-tertiary">
              An unhandled render exception occurred. Details below:
            </p>
            <pre className="p-3 rounded-lg bg-black/60 border border-separator-border text-xs text-rose-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-60">
              {this.state.error?.toString()}
              {'\n'}
              {this.state.error?.stack}
            </pre>
            <Button
              variant="primary"
              size="md"
              className="w-full justify-center"
              onClick={() => {
                localStorage.removeItem('selectedLead');
                window.location.reload();
              }}
            >
              Recover & Reload Dashboard
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
