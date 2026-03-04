'use client';

import { useState } from 'react';
import { useLanguage } from './LanguageProvider';

interface PerspectivesPanelProps {
  onClose: () => void;
  onFilterChange?: (perspective: string) => void;
}

export function PerspectivesPanel({ onClose, onFilterChange }: PerspectivesPanelProps) {
  const { t } = useLanguage();
  const [selectedPerspective, setSelectedPerspective] = useState('all');

  const perspectives = [
    {
      id: 'all',
      label: 'All Voters',
      description: 'All user perspectives',
      color: 'bg-stone-50 border-stone-200',
      badge: 'bg-stone-100 text-stone-700',
    },
    {
      id: 'supporters',
      label: 'Supporters',
      description: 'Voted 3-4 for thesis',
      color: 'bg-green-50 border-green-200',
      badge: 'bg-green-100 text-green-700',
    },
    {
      id: 'opponents',
      label: 'Opponents',
      description: 'Voted 0-1 for thesis',
      color: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-700',
    },
    {
      id: 'undecided',
      label: 'Undecided',
      description: 'Voted 2 for thesis',
      color: 'bg-amber-50 border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
    },
  ];

  const handleSelect = (perspectiveId: string) => {
    setSelectedPerspective(perspectiveId);
    if (onFilterChange) {
      onFilterChange(perspectiveId);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-stone-200 shadow-lg overflow-y-auto z-50">
      <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
        <h2 className="text-lg font-heading font-bold text-stone-800">Perspectives</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          ✕
        </button>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-stone-600 mb-4">
          Filter arguments by voter perspective on the thesis
        </p>

        {perspectives.map((perspective) => (
          <button
            key={perspective.id}
            onClick={() => handleSelect(perspective.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selectedPerspective === perspective.id
                ? `${perspective.color} border-current shadow-md`
                : `${perspective.color} border-current/20 hover:border-current/40`
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-sm text-stone-800">
                {perspective.label}
              </h3>
              {selectedPerspective === perspective.id && (
                <span className={`text-xs px-2 py-1 rounded ${perspective.badge}`}>
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-stone-600">{perspective.description}</p>
          </button>
        ))}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">💡 Tip:</span> Use perspectives to see arguments through different viewpoints and understand the debate from multiple angles.
          </p>
        </div>
      </div>
    </div>
  );
}
