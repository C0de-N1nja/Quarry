import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RiSparklingLine, 
  RiCheckLine, 
  RiTerminalBoxLine, 
  RiArrowDownSLine, 
  RiArrowUpSLine, 
  RiLoader4Line,
  RiShieldCheckLine
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';
import { StatusDot } from '@/components/base/badges/status-dot';
import { Button } from '@/components/base/buttons/button';

export default function AgentProgress({
  steps = [],
  currentStepIndex = 0,
  logs = [],
  status = 'running', // 'running', 'completed', 'error'
  title = 'AI OSINT Intelligence Agent'
}) {
  const [showLogs, setShowLogs] = useState(true);

  return (
    <div className="rounded-2xl border border-separator-border bg-background-primary-default shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-separator-border flex items-center justify-between gap-3 bg-background-secondary-default/40">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-status-blue-background text-status-blue-text flex items-center justify-center">
            {status === 'running' ? (
              <RiLoader4Line className="size-4 animate-spin" />
            ) : status === 'completed' ? (
              <RiCheckLine className="size-4 text-status-lime-text" />
            ) : (
              <RiSparklingLine className="size-4" />
            )}
          </div>
          <div>
            <h4 className="text-body-medium font-semibold text-text-primary flex items-center gap-2">
              <span>{title}</span>
              {status === 'running' && (
                <StatusDot color="indigo" className="animate-pulse" />
              )}
            </h4>
            <p className="text-caption-1-regular text-text-tertiary">
              {status === 'running' 
                ? `Executing step ${currentStepIndex + 1} of ${steps.length}...` 
                : status === 'completed' 
                  ? 'All autonomous checks completed successfully' 
                  : 'Agent paused'}
            </p>
          </div>
        </div>

        <Button
          size="xs"
          variant="secondary"
          leadingIcon={RiTerminalBoxLine}
          trailingIcon={showLogs ? RiArrowUpSLine : RiArrowDownSLine}
          onClick={() => setShowLogs(!showLogs)}
        >
          {showLogs ? 'Hide Logs' : 'View Logs'}
        </Button>
      </div>

      {/* Stepper Timeline */}
      <div className="p-3.5 border-b border-separator-border/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex || status === 'completed';
          const isCurrent = idx === currentStepIndex && status === 'running';

          return (
            <div 
              key={idx}
              className={`p-2.5 rounded-xl border text-caption-1-regular flex items-center gap-2 transition-all ${
                isDone 
                  ? 'border-status-lime-background bg-status-lime-background/20 text-text-primary' 
                  : isCurrent 
                    ? 'border-border-focus-ring bg-status-blue-background/30 text-status-blue-text ring-1 ring-border-focus-ring/40' 
                    : 'border-separator-border bg-background-secondary-default/40 text-text-tertiary'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <RiCheckLine className="size-4 text-status-lime-text" />
                ) : isCurrent ? (
                  <RiLoader4Line className="size-4 animate-spin text-status-blue-text" />
                ) : (
                  <div className="size-4 rounded-full border border-separator-border flex items-center justify-center text-[9px] font-mono">
                    {idx + 1}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-caption-1-semibold truncate">{step.label}</p>
                <p className="text-caption-1-regular text-text-tertiary truncate">{step.desc}</p>
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
            className="bg-background-secondary-default p-3 text-caption-1-regular font-mono text-text-secondary max-h-48 overflow-y-auto space-y-1 border-t border-separator-border/40"
          >
            {logs.length === 0 ? (
              <div className="text-text-tertiary italic py-2">Listening for streaming agent trace events...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-text-tertiary shrink-0">[{new Date().toLocaleTimeString().slice(0, 5)}]</span>
                  <span className={
                    log.includes('Success') || log.includes('Owner') || log.includes('Verified')
                      ? 'text-status-lime-text font-semibold'
                      : log.includes('Warning') || log.includes('Alert')
                        ? 'text-status-yellow-text'
                        : log.includes('Error') || log.includes('Fail')
                          ? 'text-status-rose-text'
                          : 'text-text-primary'
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
