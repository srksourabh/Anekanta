'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';

interface SourcesPanelProps {
  debateId: string;
  onClose: () => void;
}

export function SourcesPanel({ debateId, onClose }: SourcesPanelProps) {
  const { t } = useLanguage();
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSources();
  }, [debateId]);

  const loadSources = async () => {
    try {
      const res = await fetch(`/api/debates/${debateId}/sources`);
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (err) {
      console.error('Error loading sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-stone-200 shadow-lg overflow-y-auto z-50">
      <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
        <h2 className="text-lg font-heading font-bold text-stone-800">Sources</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          ✕
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center text-stone-400 py-8">Loading sources...</div>
        ) : sources.length === 0 ? (
          <div className="text-center text-stone-400 py-8 text-sm">
            No sources referenced yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="card p-3 space-y-2 border-l-2 border-earth-300">
                <div className="flex items-start justify-between">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm font-medium text-saffron-600 hover:underline break-words"
                    title={source.url}
                  >
                    {getDomain(source.url)}
                  </a>
                  <span className="text-xs text-stone-400 ml-2">↗</span>
                </div>

                {source.quote && (
                  <p className="text-xs text-stone-600 italic border-l-2 border-stone-300 pl-2">
                    "{source.quote.slice(0, 100)}{source.quote.length > 100 ? '...' : ''}"
                  </p>
                )}

                {source.argument_content && (
                  <p className="text-xs text-stone-500">
                    Cited by: <span className="font-medium">{source.argument_content.slice(0, 50)}...</span>
                  </p>
                )}

                <p className="text-xs text-stone-400">
                  Added by <span className="font-medium">{source.added_by_name}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
