'use client';

export const PERSPECTIVES = [
  'Economic', 'Ethical', 'Scientific', 'Cultural',
  'Legal', 'Personal', 'Historical', 'Practical'
] as const;

const PERSPECTIVE_COLORS: Record<string, { bg: string; text: string }> = {
  Economic: { bg: 'bg-blue-50', text: 'text-blue-700' },
  Ethical: { bg: 'bg-purple-50', text: 'text-purple-700' },
  Scientific: { bg: 'bg-cyan-50', text: 'text-cyan-700' },
  Cultural: { bg: 'bg-rose-50', text: 'text-rose-700' },
  Legal: { bg: 'bg-amber-50', text: 'text-amber-700' },
  Personal: { bg: 'bg-green-50', text: 'text-green-700' },
  Historical: { bg: 'bg-stone-100', text: 'text-stone-700' },
  Practical: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

interface PerspectiveTagProps {
  perspective: string;
  size?: 'sm' | 'md';
}

export function PerspectiveTag({ perspective, size = 'sm' }: PerspectiveTagProps) {
  if (!perspective) return null;

  const colors = PERSPECTIVE_COLORS[perspective] || { bg: 'bg-stone-50', text: 'text-stone-600' };
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClass}`}>
      {perspective}
    </span>
  );
}
