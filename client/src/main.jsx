import React from 'react';
import ReactDOM from 'react-dom/client';
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
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-bold">Client Hunter OS Exception Caught</h2>
            </div>
            <p className="text-xs text-gray-400">
              An unhandled render exception occurred. Details below:
            </p>
            <pre className="p-3 rounded-lg bg-black/60 border border-border-subtle text-xs text-rose-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-60">
              {this.state.error?.toString()}
              {'\n'}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => {
                localStorage.removeItem('selectedLead');
                window.location.reload();
              }}
              className="w-full py-2.5 rounded-lg bg-brand hover:bg-brand/90 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Recover & Reload Dashboard
            </button>
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
