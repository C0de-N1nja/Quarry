import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, Loader2, AlertCircle, ChevronDown, 
  ChevronUp, Terminal, Sparkles, Shield, Cpu 
} from 'lucide-react';

export default function AgentProgress({
  steps = [],
  currentStepIndex = 0,
  logs = [],
  status = 'running', // 'running', 'completed', 'error'
  title = 'AI OSINT Intelligence Agent'
}) {
  const [showLogs, setShowLogs] = useState(true);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1/90 backdrop-blur-md overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-3 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-2/40">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
            {status === 'running' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : status === 'completed' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>{title}</span>
              {status === 'running' && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                </span>
              )}
            </h4>
            <p className="text-[11px] text-gray-500">
              {status === 'running' 
                ? `Executing step ${currentStepIndex + 1} of ${steps.length}...` 
                : status === 'completed' 
                  ? 'All autonomous checks completed successfully' 
                  : 'Agent paused'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowLogs(!showLogs)}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded bg-surface-2 hover:bg-surface-3 text-gray-600 dark:text-gray-300 border border-border-subtle transition-colors cursor-pointer"
        >
          <Terminal className="h-3 w-3" />
          <span>{showLogs ? 'Hide Logs' : 'View Logs'}</span>
          {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Stepper Timeline */}
      <div className="p-3.5 border-b border-border-subtle/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex || status === 'completed';
          const isCurrent = idx === currentStepIndex && status === 'running';
          const isPending = idx > currentStepIndex && status !== 'completed';

          return (
            <div 
              key={idx}
              className={`p-2 rounded-lg border text-xs flex items-center gap-2 transition-all ${
                isDone 
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-gray-800 dark:text-gray-200' 
                  : isCurrent 
                    ? 'border-brand/40 bg-brand/5 text-brand shadow-xs ring-1 ring-brand/30' 
                    : 'border-border-subtle bg-surface-2/40 text-gray-400'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-gray-400/50 flex items-center justify-center text-[9px] font-mono">
                    {idx + 1}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[11px] truncate">{step.label}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Logs Collapsible */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#0b0d14] p-3 text-[11px] font-mono text-gray-300 max-h-48 overflow-y-auto space-y-1"
          >
            {logs.length === 0 ? (
              <div className="text-gray-500 italic py-2">Listening for streaming agent trace events...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-gray-500 shrink-0">[{new Date().toLocaleTimeString().slice(0, 5)}]</span>
                  <span className={
                    log.includes('✓') || log.includes('Success') || log.includes('Owner')
                      ? 'text-emerald-400'
                      : log.includes('Warning') || log.includes('⚠️')
                        ? 'text-amber-400'
                        : log.includes('Error') || log.includes('Fail')
                          ? 'text-rose-400'
                          : 'text-gray-300'
                  }>
                    {log}
                  </span>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
