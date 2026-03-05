'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

interface StructuredDebateLayoutProps {
  debate: any;
  tags?: { id: string; tag: string }[];
  children: React.ReactNode; // The dual-column tree or classic tree goes here
}

export function StructuredDebateLayout({ debate, tags, children }: StructuredDebateLayoutProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Thesis Card — prominent, centered */}
      {debate.thesis && (
        <div className="card p-6 border-l-4 border-teal-400 bg-gradient-to-r from-teal-50/30 to-transparent">
          <p className="text-[10px] font-medium text-teal-600 uppercase tracking-wider mb-2">{t('debate_thesis')}</p>
          <p className="text-stone-800 text-base leading-relaxed">{debate.thesis}</p>
        </div>
      )}

      {/* Tagline — italic subtitle */}
      {debate.tagline && (
        <p className="text-stone-500 italic text-sm px-1 -mt-2">{debate.tagline}</p>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {tags.map(tag => (
            <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600">
              #{tag.tag}
            </span>
          ))}
        </div>
      )}

      {/* Main content — Pro/Con tree */}
      <div>
        {children}
      </div>

      {/* Conclusion — at the bottom */}
      {debate.conclusion && (
        <div className="card p-5 border-l-4 border-stone-300 bg-stone-50/50 mt-8">
          <p className="text-[10px] font-medium text-stone-600 uppercase tracking-wider mb-2">{t('debate_conclusion')}</p>
          <p className="text-stone-700 text-sm leading-relaxed">{debate.conclusion}</p>
        </div>
      )}
    </div>
  );
}
