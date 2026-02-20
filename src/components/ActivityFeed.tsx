'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

interface ActivityFeedProps {
  debateId?: string;
  limit?: number;
}

export function ActivityFeed({ debateId, limit = 15 }: ActivityFeedProps) {
  const { t } = useLanguage();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      created: t('action_created'),
      added_argument: t('action_added_argument'),
      commented: t('action_commented'),
      voted: t('action_voted'),
    };
    return actionMap[action] || action;
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (debateId) params.set('debateId', debateId);
    params.set('limit', String(limit));

    fetch(`/api/activity?${params}`)
      .then(r => r.json())
      .then(setActivities)
      .finally(() => setLoading(false));
  }, [debateId, limit]);

  if (loading) return <div className="text-sm text-stone-400 p-4">{t('loading_activity')}</div>;
  if (activities.length === 0) return <div className="text-sm text-stone-400 p-4">{t('no_activity_yet')}</div>;

  return (
    <div className="space-y-0">
      {activities.map(a => {
        const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata;
        return (
          <div key={a.id} className="flex items-start gap-2 py-2.5 px-3 hover:bg-stone-50 border-b border-stone-100 last:border-0">
            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5" style={{ backgroundColor: a.user_color }}>
              {a.user_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-700">
                <span className="font-medium" style={{ color: a.user_color }}>{a.user_name}</span>
                {' '}{getActionLabel(a.action)}
                {!debateId && a.debate_title && (
                  <> {t('activity_in')} <Link href={`/debates/${a.debate_id}`} className="text-saffron-600 hover:underline">{a.debate_title}</Link></>
                )}
                {meta?.type && (
                  <span className={`ml-1 badge text-[9px] ${meta.type === 'pro' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{meta.type === 'pro' ? t('debate_pro') : t('debate_con')}</span>
                )}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
