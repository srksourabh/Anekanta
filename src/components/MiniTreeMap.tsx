'use client';

import { useMemo } from 'react';
import { getPathIds } from '@/lib/treeUtils';
import type { Argument } from '@/lib/types';

interface MiniTreeMapProps {
  thesis: Argument;
  focusedId: string;
  onNavigate: (path: string[]) => void;
}

const NODE_W = 20;
const NODE_H = 14;
const H_GAP = 4;
const V_GAP = 18;
const MAX_DEPTH = 3;

const TYPE_COLORS: Record<string, string> = {
  thesis: '#2563eb',
  pro: '#16a34a',
  con: '#dc2626',
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
}

/** Width of this node's subtree in pixels */
function subtreeWidth(node: Argument, depth: number): number {
  if (depth >= MAX_DEPTH || !node.children || node.children.length === 0) {
    return NODE_W;
  }
  const childrenWidth = node.children.reduce((sum, c) =>
    sum + subtreeWidth(c, depth + 1), 0);
  const gapsWidth = (node.children.length - 1) * H_GAP;
  return Math.max(NODE_W, childrenWidth + gapsWidth);
}

/** Recursively compute positions for each node */
function computeLayout(
  node: Argument,
  x: number,
  y: number,
  depth: number,
  pathSet: Set<string>,
  focusedId: string,
  parentCenter?: { cx: number; cy: number },
): LayoutNode[] {
  const myWidth = subtreeWidth(node, depth);
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
  }];

  if (depth >= MAX_DEPTH || !node.children || node.children.length === 0) return nodes;

  let childX = x;
  for (const child of node.children) {
    const cw = subtreeWidth(child, depth + 1);
    nodes.push(...computeLayout(
      child, childX, y + NODE_H + V_GAP, depth + 1,
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
    const totalWidth = subtreeWidth(thesis, 0);
    const nodes = computeLayout(thesis, 0, 0, 0, pathSet, focusedId);
    return { nodes, totalWidth };
  }, [thesis, focusedId]);

  // Compute SVG bounds
  const maxY = Math.max(...layout.nodes.map(n => n.y + NODE_H));
  const svgWidth = layout.totalWidth;
  const svgHeight = maxY;
  const padding = 4;

  const handleClick = (nodeId: string) => {
    const path = getPathIds(thesis, nodeId);
    if (path.length > 0) {
      onNavigate(path);
    }
  };

  return (
    <div className="flex justify-center mb-4">
      <svg
        viewBox={`${-padding} ${-padding} ${svgWidth + padding * 2} ${svgHeight + padding * 2}`}
        className="max-w-sm w-auto"
        style={{ height: `${Math.min(svgHeight + padding * 2, 100)}px` }}
      >
        {/* Lines from parent to child */}
        {layout.nodes
          .filter(n => n.parentCx !== undefined)
          .map(n => (
            <line
              key={`line-${n.id}`}
              x1={n.parentCx}
              y1={n.parentCy}
              x2={n.cx}
              y2={n.y}
              stroke={n.isOnPath ? '#78716c' : '#d6d3d1'}
              strokeWidth={n.isOnPath ? 1.5 : 1}
            />
          ))}

        {/* Nodes */}
        {layout.nodes.map(n => {
          const color = TYPE_COLORS[n.type] || TYPE_COLORS.thesis;
          return (
            <g key={n.id} onClick={() => handleClick(n.id)} className="cursor-pointer">
              <rect
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                rx={2}
                fill={n.isFocused ? color : n.isOnPath ? color : color}
                fillOpacity={n.isFocused ? 1 : n.isOnPath ? 0.8 : 0.5}
                stroke={n.isFocused ? '#1c1917' : 'none'}
                strokeWidth={n.isFocused ? 2 : 0}
              />
              {/* Outline for thesis */}
              {n.type === 'thesis' && !n.isFocused && (
                <rect
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={2}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
