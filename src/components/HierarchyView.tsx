'use client';

import { useState, useCallback } from 'react';
import type { Argument } from '@/lib/types';

interface HierarchyViewProps {
  thesis: Argument;
  onDrillDown?: (argId: string) => void;
}

const TYPE_COLORS = {
  thesis: { border: '#c47a2e', bg: '#fef3c7', badge: '#92400e' },
  pro: { border: '#16a34a', bg: '#f0fdf4', badge: '#166534' },
  con: { border: '#dc2626', bg: '#fef2f2', badge: '#991b1b' },
};

function HierarchyCard({
  node,
  isExpanded,
  onToggle,
  onDrillDown,
}: {
  node: Argument;
  isExpanded: boolean;
  onToggle: () => void;
  onDrillDown?: (id: string) => void;
}) {
  const colors = TYPE_COLORS[node.type] || TYPE_COLORS.thesis;
  const childCount = node.children?.length || 0;
  const hasChildren = childCount > 0;
  const initial = node.author_name?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={() => {
          if (hasChildren) onToggle();
          else if (onDrillDown) onDrillDown(node.id);
        }}
        className="group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer select-none"
        style={{
          borderLeft: `4px solid ${colors.border}`,
          borderColor: `${colors.border}33`,
          borderLeftColor: colors.border,
          background: `linear-gradient(135deg, #ffffff 0%, ${colors.bg} 100%)`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
          minWidth: '180px',
          maxWidth: '260px',
        }}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{
            backgroundColor: node.author_color || colors.border,
            boxShadow: `0 2px 6px ${node.author_color || colors.border}55`,
          }}
        >
          {initial}
        </div>

        {/* Text */}
        <div className="min-w-0 text-left">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            {node.type === 'thesis' ? 'Thesis' : node.type === 'pro' ? 'Pro' : 'Con'}
          </div>
          <div className="text-sm font-medium text-stone-800 truncate max-w-[160px]">
            {node.author_name || 'Anonymous'}
          </div>
          <div className="text-xs text-stone-500 truncate max-w-[160px]">
            {node.content.length > 50 ? node.content.slice(0, 50) + '...' : node.content}
          </div>
        </div>

        {/* Expand indicator */}
        {hasChildren && (
          <svg
            className="w-4 h-4 text-stone-400 shrink-0 transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {/* Child count badge */}
      {hasChildren && !isExpanded && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{
            backgroundColor: colors.badge,
            boxShadow: `0 2px 8px ${colors.badge}44`,
          }}
        >
          {childCount}
        </div>
      )}
    </div>
  );
}

function HierarchyNode({
  node,
  expandedNodes,
  onToggle,
  onDrillDown,
  depth = 0,
}: {
  node: Argument;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
  onDrillDown?: (id: string) => void;
  depth?: number;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const children = node.children || [];
  const hasChildren = children.length > 0;

  return (
    <div className="flex items-start gap-0">
      {/* The card */}
      <div className="flex flex-col justify-center py-2">
        <HierarchyCard
          node={node}
          isExpanded={isExpanded}
          onToggle={() => onToggle(node.id)}
          onDrillDown={onDrillDown}
        />
      </div>

      {/* Connector + Children */}
      {hasChildren && isExpanded && (
        <div className="flex items-center">
          {/* Horizontal connector from card to branch */}
          <div className="relative flex items-center">
            <div className="w-8 h-px bg-stone-400" />
            <div className="w-2.5 h-2.5 rounded-full border-2 border-stone-400 bg-white shrink-0 -ml-px" />
          </div>

          {/* Children column with vertical line */}
          <div className="relative flex flex-col">
            {/* Vertical connector line */}
            {children.length > 1 && (
              <div
                className="absolute left-0 bg-stone-300"
                style={{
                  width: '2px',
                  top: `${children.length === 1 ? 50 : 25}%`,
                  bottom: `${children.length === 1 ? 50 : 25}%`,
                }}
              />
            )}

            {children.map((child, idx) => (
              <div key={child.id} className="flex items-center">
                {/* Horizontal line from vertical to child */}
                <div className="relative flex items-center">
                  <div className="w-6 h-px bg-stone-300" />
                  <div className="w-2 h-2 rounded-full border-2 border-stone-400 bg-white shrink-0 -ml-px" />
                </div>

                {/* Recurse */}
                <HierarchyNode
                  node={child}
                  expandedNodes={expandedNodes}
                  onToggle={onToggle}
                  onDrillDown={onDrillDown}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function HierarchyView({ thesis, onDrillDown }: HierarchyViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Start with thesis and its direct children expanded
    const initial = new Set<string>([thesis.id]);
    return initial;
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div className="card p-6">
      <div className="overflow-x-auto pb-4">
        <div className="inline-flex min-w-max">
          <HierarchyNode
            node={thesis}
            expandedNodes={expandedNodes}
            onToggle={handleToggle}
            onDrillDown={onDrillDown}
          />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-stone-200 flex items-center gap-4 text-xs text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TYPE_COLORS.thesis.border }} />
          Thesis
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TYPE_COLORS.pro.border }} />
          Pro
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TYPE_COLORS.con.border }} />
          Con
        </span>
        <span className="ml-auto">Click nodes to expand/collapse</span>
      </div>
    </div>
  );
}
