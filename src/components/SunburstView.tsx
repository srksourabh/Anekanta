'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { countDescendants } from '@/lib/treeUtils';
import type { Argument } from '@/lib/types';

interface SunburstViewProps {
  thesis: Argument;
  onDrillDown: (argId: string) => void;
}

interface ArcData {
  id: string;
  content: string;
  type: string;
  depth: number;
  startAngle: number;
  endAngle: number;
  author_name?: string;
  vote_score: number;
}

const COLORS = {
  thesis: '#0d9488',  // saffron
  pro: '#16a34a',     // green
  con: '#dc2626',     // red
};

const MAX_RINGS = 5;
const CENTER_RADIUS = 50;
const RING_WIDTH = 35;
const SVG_SIZE = 500;
const CENTER = SVG_SIZE / 2;

function getColor(type: string, depth: number): string {
  const base = COLORS[type as keyof typeof COLORS] || COLORS.thesis;
  // Slightly lighten deeper rings for visual depth
  if (depth <= 1) return base;
  const lighten = Math.min(depth * 0.08, 0.3);
  return base + Math.round((1 - lighten) * 255).toString(16).padStart(2, '0').slice(0, 0) || base;
}

function getOpacity(depth: number): number {
  return Math.max(0.5, 1 - depth * 0.1);
}

/**
 * Walk the argument tree and compute arc segments for each node.
 * Angular span is proportional to (1 + descendant count) so even
 * leaf nodes get a visible slice.
 */
function computeArcs(thesis: Argument): ArcData[] {
  const arcs: ArcData[] = [];

  function walk(node: Argument, depth: number, startAngle: number, sweep: number) {
    if (depth > MAX_RINGS) return;

    arcs.push({
      id: node.id,
      content: node.content,
      type: node.type,
      depth,
      startAngle,
      endAngle: startAngle + sweep,
      author_name: node.author_name,
      vote_score: node.vote_score,
    });

    const children = node.children || [];
    if (children.length === 0 || depth >= MAX_RINGS) return;

    // Weight each child by (1 + its descendant count)
    const weights = children.map(c => 1 + countDescendants(c).total);
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let currentAngle = startAngle;
    children.forEach((child, i) => {
      const childSweep = (weights[i] / totalWeight) * sweep;
      // Small gap between siblings
      const gap = children.length > 1 ? 0.005 : 0;
      walk(child, depth + 1, currentAngle + gap, childSweep - gap * 2);
      currentAngle += childSweep;
    });
  }

  // Thesis occupies the full circle at depth 0
  walk(thesis, 0, 0, Math.PI * 2);
  return arcs;
}

/**
 * Generate SVG arc path for a ring segment.
 */
function arcPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startAngle: number, endAngle: number,
): string {
  // Full circle case
  const sweep = endAngle - startAngle;
  if (sweep >= Math.PI * 2 - 0.01) {
    // Draw two semicircles for a full ring
    return [
      `M ${cx + outerR} ${cy}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy}`,
      `Z`,
      `M ${cx + innerR} ${cy}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy}`,
      `Z`,
    ].join(' ');
  }

  const largeArc = sweep > Math.PI ? 1 : 0;

  const x1o = cx + outerR * Math.cos(startAngle);
  const y1o = cy + outerR * Math.sin(startAngle);
  const x2o = cx + outerR * Math.cos(endAngle);
  const y2o = cy + outerR * Math.sin(endAngle);
  const x1i = cx + innerR * Math.cos(endAngle);
  const y1i = cy + innerR * Math.sin(endAngle);
  const x2i = cx + innerR * Math.cos(startAngle);
  const y2i = cy + innerR * Math.sin(startAngle);

  return [
    `M ${x1o} ${y1o}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o} ${y2o}`,
    `L ${x1i} ${y1i}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2i} ${y2i}`,
    `Z`,
  ].join(' ');
}

function truncate(text: string, len: number): string {
  return text.length > len ? text.slice(0, len) + '...' : text;
}

export function SunburstView({ thesis, onDrillDown }: SunburstViewProps) {
  const { t } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; arc: ArcData } | null>(null);

  const arcs = useMemo(() => computeArcs(thesis), [thesis]);

  // Separate the thesis (depth 0) from ring arcs
  const thesisArc = arcs.find(a => a.depth === 0);
  const ringArcs = arcs.filter(a => a.depth > 0);

  const handleMouseMove = (e: React.MouseEvent, arc: ArcData) => {
    const rect = (e.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      arc,
    });
    setHoveredId(arc.id);
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setHoveredId(null);
  };

  const handleClick = (arc: ArcData) => {
    onDrillDown(arc.id);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-lg mx-auto">
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="w-full h-auto"
          style={{ maxHeight: '500px' }}
        >
          {/* Ring arcs (depth 1+) — render deeper rings first so shallower arcs paint over on hover */}
          {ringArcs
            .sort((a, b) => b.depth - a.depth)
            .map(arc => {
              const innerR = CENTER_RADIUS + (arc.depth - 1) * RING_WIDTH;
              const outerR = CENTER_RADIUS + arc.depth * RING_WIDTH;
              const color = COLORS[arc.type as keyof typeof COLORS] || COLORS.thesis;
              const isHovered = hoveredId === arc.id;

              return (
                <path
                  key={arc.id}
                  d={arcPath(CENTER, CENTER, innerR, outerR, arc.startAngle, arc.endAngle)}
                  fill={color}
                  fillOpacity={isHovered ? 1 : getOpacity(arc.depth)}
                  stroke="white"
                  strokeWidth={1}
                  className="cursor-pointer transition-opacity duration-150"
                  onMouseMove={(e) => handleMouseMove(e, arc)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(arc)}
                />
              );
            })}

          {/* Thesis center circle */}
          {thesisArc && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={CENTER_RADIUS}
              fill={COLORS.thesis}
              className="cursor-pointer"
              onMouseMove={(e) => handleMouseMove(e, thesisArc)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(thesisArc)}
            />
          )}

          {/* Center label */}
          <text
            x={CENTER}
            y={CENTER - 6}
            textAnchor="middle"
            className="fill-white text-xs font-medium pointer-events-none"
            style={{ fontSize: '11px' }}
          >
            {truncate(thesis.content, 20)}
          </text>
          <text
            x={CENTER}
            y={CENTER + 10}
            textAnchor="middle"
            className="fill-white/70 pointer-events-none"
            style={{ fontSize: '9px' }}
          >
            Thesis
          </text>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 pointer-events-none bg-white rounded-lg shadow-lg border border-stone-200 p-3 max-w-xs"
            style={{
              left: Math.min(tooltip.x + 10, SVG_SIZE - 200),
              top: tooltip.y - 10,
              transform: 'translateY(-100%)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[tooltip.arc.type as keyof typeof COLORS] || COLORS.thesis }}
              />
              <span className="text-[10px] font-medium text-stone-500 uppercase">
                {tooltip.arc.type}
              </span>
              <span className="text-[10px] text-stone-400 ml-auto">
                Score: {tooltip.arc.vote_score}
              </span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              {truncate(tooltip.arc.content, 120)}
            </p>
            {tooltip.arc.author_name && (
              <p className="text-[10px] text-stone-400 mt-1">
                by {tooltip.arc.author_name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-stone-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.thesis }} />
          <span>Thesis</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.pro }} />
          <span>Pro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.con }} />
          <span>Con</span>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-stone-400 text-center">
        {t('sunburst_click_hint')}
      </p>
    </div>
  );
}
