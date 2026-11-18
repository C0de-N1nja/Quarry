import React, { useState, useEffect } from 'react';
import { 
  RiMapPinLine, 
  RiCompass3Line, 
  RiAlertLine, 
  RiShieldCheckLine, 
  RiRefreshLine,
  RiArrowRightUpLine
} from '@remixicon/react';
import { Chip } from '@/components/base/badges/chip';

export default function LocalRankGridCard({ lead }) {
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead?.id) {
      setLoading(true);
      fetch(`/api/leads/${lead.id}/rank-grid`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.grid) setGridData(d.grid);
        })
        .catch(err => console.error('Failed to load rank grid', err))
        .finally(() => setLoading(false));
    }
  }, [lead?.id]);

  if (!lead) return null;

  const nodes = gridData?.nodes || [];

  return (
    <section className="rounded-2xl border border-separator-border bg-background-primary-default p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiCompass3Line className="size-4 text-emerald-500" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
            Local SEO Grid Rank Heatmap
          </h2>
          <Chip variant="subtle" color={gridData?.hasWebsite ? 'emerald' : 'rose'} size="sm">
            {gridData?.hasWebsite ? '3x3 Radius Active' : 'Search Radius Constrained'}
          </Chip>
        </div>
        <span className="text-[11px] font-mono text-text-tertiary">
          3x3 Geographic Dispersion
        </span>
      </div>

      {loading ? (
        <div className="h-44 rounded-xl bg-background-secondary-default animate-pulse" />
      ) : (
        <>
          {/* 3x3 Grid Map Visualization */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-background-secondary-default/50 border border-separator-border">
            {nodes.map((node) => {
              const isCenter = node.id === 'c';
              const isGreen = node.color === 'green';
              const isAmber = node.color === 'amber';

              return (
                <div
                  key={node.id}
                  className={`p-2.5 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${
                    isGreen
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : isAmber
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  } ${isCenter ? 'ring-1 ring-emerald-400/60 shadow-xs' : ''}`}
                >
                  <span className="text-[10px] font-mono text-text-tertiary uppercase truncate max-w-full">
                    {node.name}
                  </span>
                  <span className="text-base font-bold font-mono tracking-tight my-0.5">
                    #{node.rank}
                  </span>
                  <span className="text-[9px] font-mono opacity-75">
                    {node.distanceMi > 0 ? `${node.distanceMi} mi` : 'Shop Point'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Key Metrics Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-background-secondary-default border border-separator-border space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-tertiary block">Center Rank</span>
              <span className="font-mono text-body-medium font-bold text-text-primary">
                #{gridData?.centerRank || 'N/A'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-background-secondary-default border border-separator-border space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-tertiary block">Average Grid Rank</span>
              <span className="font-mono text-body-medium font-bold text-text-primary">
                #{gridData?.averageRank || 'N/A'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-background-secondary-default border border-separator-border space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-tertiary block">Top 3-Pack Share</span>
              <span className="font-mono text-body-medium font-bold text-emerald-400">
                {gridData?.top3Share !== undefined ? `${gridData.top3Share}%` : 'N/A'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-background-secondary-default border border-separator-border space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-text-tertiary block">Effective Radius</span>
              <span className="font-mono text-body-medium font-bold text-text-primary">
                {gridData?.effectiveRadius || 'N/A'}
              </span>
            </div>
          </div>

          {/* Strategic Insight Alert */}
          <div className="p-3 rounded-xl bg-background-secondary-default border border-separator-border/80 flex items-start gap-2.5 text-xs text-text-secondary">
            <RiAlertLine className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-text-primary">Geographic Revenue Alert: </span>
              {gridData?.insight}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
