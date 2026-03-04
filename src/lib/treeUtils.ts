import type { Argument } from './types';

/**
 * Find a node in the argument tree by walking a path of IDs.
 * Returns the node at the end of the path, or null if not found.
 */
export function findNodeByPath(thesis: Argument, path: string[]): Argument | null {
  if (!thesis || path.length === 0) return thesis;
  if (path[0] === thesis.id) {
    if (path.length === 1) return thesis;
    return findNodeInChildren(thesis, path.slice(1));
  }
  return null;
}

function findNodeInChildren(node: Argument, remainingPath: string[]): Argument | null {
  if (remainingPath.length === 0) return node;
  const children = node.children || [];
  const nextId = remainingPath[0];
  const child = children.find(c => c.id === nextId);
  if (!child) return null;
  if (remainingPath.length === 1) return child;
  return findNodeInChildren(child, remainingPath.slice(1));
}

/**
 * Build the ancestor chain (breadcrumb path) from thesis to a target node.
 * Returns array of nodes from thesis down to (and including) the target.
 */
export function getAncestorChain(thesis: Argument, targetId: string): Argument[] {
  const path: Argument[] = [];
  if (findPath(thesis, targetId, path)) {
    return path;
  }
  return [thesis];
}

function findPath(node: Argument, targetId: string, path: Argument[]): boolean {
  path.push(node);
  if (node.id === targetId) return true;
  for (const child of (node.children || [])) {
    if (findPath(child, targetId, path)) return true;
  }
  path.pop();
  return false;
}

/**
 * Flatten the tree into a single array of all arguments.
 */
export function flattenTree(node: Argument): Argument[] {
  const result: Argument[] = [node];
  for (const child of (node.children || [])) {
    result.push(...flattenTree(child));
  }
  return result;
}

/**
 * Get pro and con children of a node, sorted by the given criteria.
 */
export function getProConChildren(
  node: Argument,
  sortBy: 'votes' | 'recent' = 'votes'
): { pros: Argument[]; cons: Argument[] } {
  const children = node.children || [];
  const sortFn = (a: Argument, b: Argument) =>
    sortBy === 'votes'
      ? b.vote_score - a.vote_score
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

  return {
    pros: children.filter(c => c.type === 'pro').sort(sortFn),
    cons: children.filter(c => c.type === 'con').sort(sortFn),
  };
}

/**
 * Count total descendants (pro and con) of a node.
 */
export function countDescendants(node: Argument): { total: number; pros: number; cons: number } {
  let pros = 0;
  let cons = 0;
  for (const child of (node.children || [])) {
    if (child.type === 'pro') pros++;
    else if (child.type === 'con') cons++;
    const sub = countDescendants(child);
    pros += sub.pros;
    cons += sub.cons;
  }
  return { total: pros + cons, pros, cons };
}

/**
 * Get path IDs from thesis to a target node.
 */
export function getPathIds(thesis: Argument, targetId: string): string[] {
  return getAncestorChain(thesis, targetId).map(n => n.id);
}
