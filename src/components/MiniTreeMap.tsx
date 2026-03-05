'use client';

import { useMemo } from 'react';
import { getPathIds } from '@/lib/treeUtils';
import type { Argument } from '@/lib/types';

interface MiniTreeMapProps {
  thesis: Argument;
  focusedId: string;
  onNavigate: (path: string[]) => void;
}

const NODE_W = 26;
const NODE_H = 16;
const H_GAP = 6;
const V_GAP = 22;

const TYPE_COLORS: Record<string, { fill: string; light: string; dark: string }> = {
  thesis: { fill: '#2563eb', light: '#60a5fa', dark: '#1d4ed8' },
  pro:    { fill: '#16a34a', light: '#4ade80', dark: '#15803d' },
  con:    { fill: '#dc2626', light: '#f87171', dark: '#b91c1c' },
};

interface LayoutNode {
  id: string;
  type: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  parentCx?: number;
  parentCy?: number;
  isOnPath: boolean;
  isFocused: boolean;
  childCount: number;
}

/** Width of this node's subtree — no depth limit, expands all branches */
function subtreeWidth(node: Argument): number {
  if (!node.children || node.children.length === 0) {
    return NODE_W;
  }
  const childrenWidth = node.children.reduce((sum, c) =>
    sum + subtreeWidth(c), 0);
  const gapsWidth = (node.children.length - 1) * H_GAP;
  return Math.max(NODE_W, childrenWidth + gapsWidth);
}

/** Recursively compute positions — no depth limit, auto-expands all */
function computeLayout(
  node: Argument,
  x: number,
  y: number,
  pathSet: Set<string>,
  focusedId: string,
  parentCenter?: { cx: number; cy: number },
): LayoutNode[] {
  const myWidth = subtreeWidth(node);
  const cx = x + myWidth / 2;
  const cy = y + NODE_H / 2;

  const nodes: LayoutNode[] = [{
    id: node.id,
    type: node.type,
    x: cx - NODE_W / 2,
    y,
    cx,
    cy,
    parentCx: parentCenter?.cx,
    parentCy: parentCenter?.cy,
    isOnPath: pathSet.has(node.id),
    isFocused: node.id === focusedId,
    childCount: node.children?.length ?? 0,
  }];

  if (!node.children || node.children.length === 0) return nodes;

  let childX = x;
  for (const child of node.children) {
    const cw = subtreeWidth(child);
    nodes.push(...computeLayout(
      child, childX, y + NODE_H + V_GAP,
      pathSet, focusedId, { cx, cy: y + NODE_H }
    ));
    childX += cw + H_GAP;
  }

  return nodes;
}

export function MiniTreeMap({ thesis, focusedId, onNavigate }: MiniTreeMapProps) {
  const layout = useMemo(() => {
    const pathIds = getPathIds(thesis, focusedId);
    const pathSet = new Set(pathIds);
    const totalWidth = subtreeWidth(thesis);
    const nodes = computeLayout(thesis, 0, 0, pathSet, focusedId);
    return { nodes, totalWidth };
  }, [thesis, focusedId]);

  const maxY = Math.max(...layout.nodes.map(n => n.y + NODE_H));
  const svgWidth = layout.totalWidth;
  const svgHeight = maxY + 4;
  const padding = 6;

  const handleClick = (nodeId: string) => {
    const path = getPathIds(thesis, nodeId);
    if (path.length > 0) {
      onNavigate(path);
    }
  };

  return (
    <div className="flex justify-center mb-4 overflow-x-auto">
      <svg
        viewBox={`${-padding} ${-padding} ${svgWidth + padding * 2} ${svgHeight + padding * 2}`}
        className="w-auto"
        style={{
          height: `${Math.min(svgHeight + padding * 2, 200)}px`,
          maxWidth: '100%',
        }}
      >
        <defs>
          {/* 3D drop shadow */}
          <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.2" />
          </filter>
          <filter id="shadowFocused" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
          </filter>
          {/* Gradient for each type */}
          {Object.entries(TYPE_COLORS).map(([type, colors]) => (
            <linearGradient key={type} id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.light} />
              <stop offset="100%" stopColor={colors.dark} />
            </linearGradient>
          ))}
          {/* Highlight glow for focused node */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Curved connector lines */}
        {layout.nodes
          .filter(n => n.parentCx !== undefined)
          .map(n => {
            const midY = (n.parentCy! + n.y) / 2;
            return (
              <path
                key={`line-${n.id}`}
                d={`M ${n.parentCx} ${n.parentCy} C ${n.parentCx} ${midY}, ${n.cx} ${midY}, ${n.cx} ${n.y}`}
                fill="none"
                stroke={n.isOnPath ? '#78716c' : '#d6d3d1'}
                strokeWidth={n.isOnPath ? 1.5 : 0.8}
                strokeOpacity={n.isOnPath ? 1 : 0.6}
              />
            );
          })}

        {/* 3D Nodes */}
        {layout.nodes.map(n => {
          const opacity = n.isFocused ? 1 : n.isOnPath ? 0.9 : 0.55;

          return (
            <g
              key={n.id}
              onClick={() => handleClick(n.id)}
              className="cursor-pointer"
            >
              {/* Main 3D card with gradient + shadow */}
              <rect
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                rx={3}
                ry={3}
                fill={`url(#grad-${n.type})`}
                fillOpacity={opacity}
                filter={n.isFocused ? 'url(#shadowFocused)' : 'url(#shadow3d)'}
              />

              {/* Top edge highlight — creates 3D bevel effect */}
              <rect
                x={n.x + 1}
                y={n.y}
                width={NODE_W - 2}
                height={3}
                rx={2}
                fill="white"
                fillOpacity={n.isFocused ? 0.4 : 0.25}
              />

              {/* Golden focus ring with glow */}
              {n.isFocused && (
                <rect
                  x={n.x - 2}
                  y={n.y - 2}
                  width={NODE_W + 4}
                  height={NODE_H + 4}
                  rx={4}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  filter="url(#glow)"
                />
              )}

              {/* Diamond marker for thesis node */}
              {n.type === 'thesis' && (
                <polygon
                  points={`${n.cx},${n.y + 3} ${n.cx + 3},${n.cy} ${n.cx},${n.y + NODE_H - 3} ${n.cx - 3},${n.cy}`}
                  fill="white"
                  fillOpacity={0.5}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
