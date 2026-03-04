'use client';

import { useState } from 'react';

interface ProfileEditorProps {
  user: any;
  onUpdate: (updatedUser: any) => void;
}

const avatarColors = [
  '#a97847', // earth
  '#0f766e', // teal
  '#be185d', // lotus
  '#c74707', // saffron dark
  '#7b4d33', // brown
  '#14b8a6', // teal light
  '#ec4899', // pink
  '#ff7a0f', // orange
  '#059669', // emerald
  '#8b5cf6', // violet
];

export function ProfileEditor({ user, onUpdate }: ProfileEditorProps) {
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarColor, setAvatarColor] = useState(user.avatar_color || '#a97847');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Try PUT /api/auth/me first, if not available use PATCH /api/user/profile
      let endpoint = '/api/auth/me';
      let method = 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio.slice(0, 280),
          avatar_color: avatarColor,
        }),
      });

      if (res.status === 405) {
        // If PUT not available, try PATCH on user/profile
        endpoint = '/api/user/profile';
        method = 'PATCH';

        const res2 = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: displayName,
            bio: bio.slice(0, 280),
            avatar_color: avatarColor,
          }),
        });

        if (!res2.ok) {
          const data = await res2.json();
          setError(data.error || 'Failed to update profile');
          setLoading(false);
          return;
        }
      } else if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update profile');
        setLoading(false);
        return;
      }

      setSuccess('Profile updated successfully');
      onUpdate({ ...user, display_name: displayName, bio, avatar_color: avatarColor });
    } catch (err) {
      setError('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{success}</div>
      )}

      {/* Display Name */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
          className="input-field"
          required
          disabled={loading}
        />
        <p className="text-xs text-stone-400 mt-1">{displayName.length}/50</p>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          className="input-field resize-none"
          rows={3}
          placeholder="Tell us about yourself..."
          disabled={loading}
        />
        <p className="text-xs text-stone-400 mt-1">{bio.length}/280</p>
      </div>

      {/* Avatar Color */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">Avatar Color</label>
        <div className="grid grid-cols-5 gap-2">
          {avatarColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setAvatarColor(color)}
              className={`w-12 h-12 rounded-lg border-2 transition-all ${
                avatarColor === color ? 'border-stone-800 ring-2 ring-saffron-400' : 'border-stone-200 hover:border-stone-300'
              }`}
              style={{ backgroundColor: color }}
              disabled={loading}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
