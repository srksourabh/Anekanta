'use client';

interface ImpactIndicatorProps {
  score: number; // 0-100
  size?: 'sm' | 'md';
}

function getColor(score: number): string {
  if (score >= 75) return '#0d9488'; // teal-600
  if (score >= 50) return '#0d9488'; // teal-600
  if (score >= 25) return '#d97706'; // amber-600
  return '#9ca3af'; // gray-400
}

function getLabel(score: number): string {
  if (score >= 75) return 'High Impact';
  if (score >= 50) return 'Notable';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

export function ImpactIndicator({ score, size = 'sm' }: ImpactIndicatorProps) {
  const color = getColor(score);
  const label = getLabel(score);
  const dimension = size === 'sm' ? 20 : 28;
  const strokeWidth = size === 'sm' ? 2.5 : 3;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="inline-flex items-center gap-1" title={`Impact: ${score} — ${label}`}>
      <svg width={dimension} height={dimension} className="transform -rotate-90">
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {size === 'md' && (
        <span className="text-xs font-medium" style={{ color }}>{score}</span>
      )}
    </div>
  );
}
