'use client';

import { useEffect, useState } from 'react';
import { adminApi, profilesApi, Profile } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserProfiles(selectedUserId);
    } else {
      setSelectedProfileIds(new Set());
    }
  }, [selectedUserId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [usersRes, profilesData] = await Promise.all([
        adminApi.getUsers(),
        profilesApi.getAll({ includeDisabled: true }),
      ]);
      setUsers(usersRes.users ?? []);
      setProfiles(profilesData.filter((p) => !p.disabled));
      if (usersRes.users?.length && !selectedUserId) {
        setSelectedUserId(usersRes.users[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfiles = async (userId: string) => {
    try {
      const res = await adminApi.getUserMultipleProfiles(userId);
      setSelectedProfileIds(new Set(res.profileIds ?? []));
    } catch {
      setSelectedProfileIds(new Set());
    }
  };

  const saveUserProfiles = async () => {
    if (!selectedUserId) return;
    try {
      setIsSaving(true);
      setError('');
      await adminApi.updateUserMultipleProfiles(selectedUserId, [...selectedProfileIds]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProfile = (id: string) => {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Profile Selections</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <p className="text-gray-600">No users yet. Users are created when they register.</p>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Select User</h2>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUser(u.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedUserId === u.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {u.name || u.email}
                </button>
              ))}
            </div>
          </div>

          {selectedUserId && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Multiple Mode Profiles – {users.find((u) => u.id === selectedUserId)?.name || users.find((u) => u.id === selectedUserId)?.email}
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Select which profiles this user can use in Multiple mode. These override the global default.
              </p>
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {profiles.length === 0 ? (
                  <p className="text-sm text-gray-500">No profiles available.</p>
                ) : (
                  profiles.map((profile) => (
                    <label
                      key={profile.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProfileIds.has(profile.id)}
                        onChange={() => toggleProfile(profile.id)}
                        disabled={isSaving}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">{profile.name}</span>
                    </label>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={saveUserProfiles}
                disabled={isSaving || profiles.length === 0}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : `Save (${selectedProfileIds.size} selected)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
