'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from './LanguageProvider';

interface TeamsPanelProps {
  debateId: string;
  currentUserId?: string;
  onClose: () => void;
}

const stanceColors = {
  pro: 'bg-green-50 border-green-200 text-green-700',
  con: 'bg-red-50 border-red-200 text-red-700',
  neutral: 'bg-stone-50 border-stone-200 text-stone-700',
};

const stanceBadges = {
  pro: 'bg-green-100 text-green-700',
  con: 'bg-red-100 text-red-700',
  neutral: 'bg-stone-100 text-stone-700',
};

export function TeamsPanel({ debateId, currentUserId, onClose }: TeamsPanelProps) {
  const { t } = useLanguage();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', stance: 'pro' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTeams();
  }, [debateId]);

  const loadTeams = async () => {
    try {
      const res = await fetch(`/api/debates/${debateId}/teams`);
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/debates/${debateId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ name: '', description: '', stance: 'pro' });
        setShowCreateForm(false);
        await loadTeams();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create team');
      }
    } catch (err) {
      setError('Error creating team');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeamAction = async (teamId: string, action: string) => {
    try {
      const res = await fetch(`/api/debates/${debateId}/teams`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, action }),
      });

      if (res.ok) {
        await loadTeams();
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-stone-200 shadow-lg overflow-y-auto z-50">
      <div className="p-6 border-b border-stone-200 flex items-center justify-between sticky top-0 bg-white">
        <h2 className="text-lg font-heading font-bold text-stone-800">Teams</h2>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
          ✕
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Create Team Button */}
        {currentUserId && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary w-full py-2 text-sm"
          >
            {showCreateForm ? 'Cancel' : 'Create Team'}
          </button>
        )}

        {/* Create Form */}
        {showCreateForm && currentUserId && (
          <form onSubmit={handleCreateTeam} className="card p-4 space-y-3">
            {error && (
              <div className="text-xs text-red-700 bg-red-50 p-2 rounded">{error}</div>
            )}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Team Name</label>
              <input
                type="text"
                placeholder="e.g., Climate Experts"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field text-sm w-full"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
              <textarea
                placeholder="Team purpose..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field text-sm w-full resize-none"
                rows={2}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Stance</label>
              <select
                value={formData.stance}
                onChange={(e) => setFormData({ ...formData, stance: e.target.value })}
                className="input-field text-sm w-full"
                disabled={submitting}
              >
                <option value="pro">Pro</option>
                <option value="con">Con</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim()}
              className="btn-primary w-full py-2 text-sm"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </form>
        )}

        {/* Teams List */}
        {loading ? (
          <div className="text-center text-stone-400 py-8">Loading teams...</div>
        ) : teams.length === 0 ? (
          <div className="text-center text-stone-400 py-8 text-sm">
            No teams yet. {currentUserId && 'Create one to get started!'}
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => {
              const userMember = team.members?.find((m: any) => m.user_id === currentUserId);
              const isLeader = userMember?.role === 'leader';

              return (
                <div key={team.id} className={`card p-4 border-l-4 ${stanceColors[team.stance as keyof typeof stanceColors]}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-stone-800">{team.name}</h3>
                      <p className="text-xs text-stone-500 mt-0.5">{team.description}</p>
                    </div>
                    <span className={`badge text-xs px-2 py-1 ${stanceBadges[team.stance as keyof typeof stanceBadges]}`}>
                      {team.stance}
                    </span>
                  </div>

                  {/* Members */}
                  {team.members && team.members.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-200">
                      <p className="text-xs font-medium text-stone-600 mb-2">Members ({team.member_count})</p>
                      <div className="space-y-1">
                        {team.members.map((member: any) => (
                          <div key={member.user_id} className="flex items-center gap-2 text-xs">
                            <div
                              className="w-5 h-5 rounded-full"
                              style={{ backgroundColor: member.avatar_color }}
                              title={member.display_name}
                            />
                            <span className="text-stone-700">{member.display_name}</span>
                            {member.role === 'leader' && (
                              <span title="Team leader">👑</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {currentUserId && (
                    <div className="mt-3 pt-3 border-t border-stone-200 flex gap-2">
                      {userMember ? (
                        <>
                          {!isLeader && (
                            <button
                              onClick={() => handleTeamAction(team.id, 'leave')}
                              className="flex-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                            >
                              Leave
                            </button>
                          )}
                          {isLeader && (
                            <button
                              onClick={() => handleTeamAction(team.id, 'delete')}
                              className="flex-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleTeamAction(team.id, 'join')}
                          className="flex-1 px-2 py-1 text-xs bg-saffron-50 text-saffron-700 rounded hover:bg-saffron-100 transition-colors"
                        >
                          Join
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
