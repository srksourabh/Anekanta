'use client';

import type { Argument } from '@/lib/types';

interface ClaimBreadcrumbProps {
  ancestors: Argument[];
  onNavigate: (path: string[]) => void;
}

export function ClaimBreadcrumb({ ancestors, onNavigate }: ClaimBreadcrumbProps) {
  if (ancestors.length <= 1) return null;

  return (
    <nav className="flex items-center flex-wrap gap-y-1 mb-4 px-1">
      {ancestors.map((node, idx) => {
        const isLast = idx === ancestors.length - 1;
        const pathUpTo = ancestors.slice(0, idx + 1).map(n => n.id);
        const typeColor =
          node.type === 'pro' ? 'text-green-600' :
          node.type === 'con' ? 'text-red-600' :
          'text-earth-600';

        return (
          <span key={node.id} className="flex items-center">
            {idx > 0 && (
              <svg className="breadcrumb-separator w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className={`text-sm font-medium ${typeColor} truncate max-w-[200px]`}>
                {node.type !== 'thesis' && (
                  <span className="uppercase text-[10px] tracking-wider mr-1">
                    {node.type === 'pro' ? 'Pro' : 'Con'}:
                  </span>
                )}
                {truncateText(node.content, 40)}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(pathUpTo)}
                className="breadcrumb-item flex items-center"
              >
                {idx === 0 ? (
                  <span className="text-[10px] uppercase tracking-wider font-medium">Thesis</span>
                ) : (
                  <>
                    <span className={`uppercase text-[10px] tracking-wider mr-1 ${typeColor}`}>
                      {node.type === 'pro' ? 'Pro' : 'Con'}:
                    </span>
                    {truncateText(node.content, 30)}
                  </>
                )}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}
