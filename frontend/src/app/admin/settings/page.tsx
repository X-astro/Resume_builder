'use client';

import { useEffect, useState } from 'react';
import { adminApi, profilesApi, AIModelSettings, Profile } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AIModelSettings | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [multipleProfileIds, setMultipleProfileIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingMultiple, setIsSavingMultiple] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [data, profilesData, multipleData] = await Promise.all([
        adminApi.getAIModels(),
        profilesApi.getAll({ includeDisabled: true }),
        adminApi.getMultipleProfiles().catch(() => ({ profileIds: [] })),
      ]);
      setSettings(data);
      setProfiles(profilesData.filter((p) => !p.disabled));
      setMultipleProfileIds(new Set(multipleData.profileIds ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveMultipleProfiles = async () => {
    try {
      setIsSavingMultiple(true);
      setError('');
      await adminApi.updateMultipleProfiles([...multipleProfileIds]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save multiple profiles');
    } finally {
      setIsSavingMultiple(false);
    }
  };

  const toggleMultipleProfile = (id: string) => {
    setMultipleProfileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const update = async (next: AIModelSettings) => {
    if (!next.openaiEnabled && !next.claudeEnabled) {
      setError('At least one AI model must remain enabled.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const updated = await adminApi.updateAIModels(next);
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">AI Models</h2>
        <p className="text-sm text-gray-600">
          Disabled models are hidden in Resume Builder and blocked in API requests.
        </p>

        <label className="flex items-center justify-between border rounded-md p-4">
          <div>
            <div className="font-medium text-gray-900">OpenAI</div>
            <div className="text-sm text-gray-500">Enable OpenAI model option</div>
          </div>
          <input
            type="checkbox"
            checked={!!settings?.openaiEnabled}
            disabled={isSaving}
            onChange={(e) =>
              update({
                openaiEnabled: e.target.checked,
                claudeEnabled: !!settings?.claudeEnabled,
              })
            }
          />
        </label>

        <label className="flex items-center justify-between border rounded-md p-4">
          <div>
            <div className="font-medium text-gray-900">Claude</div>
            <div className="text-sm text-gray-500">Enable Claude model option</div>
          </div>
          <input
            type="checkbox"
            checked={!!settings?.claudeEnabled}
            disabled={isSaving}
            onChange={(e) =>
              update({
                openaiEnabled: !!settings?.openaiEnabled,
                claudeEnabled: e.target.checked,
              })
            }
          />
        </label>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-5 mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Multiple Mode – Default Selection</h2>
        <p className="text-sm text-gray-600">
          When you select profiles here and save, users can build resumes in Multiple mode without selecting on the Resume Builder page—these profiles are auto-selected. A user&apos;s own saved selection (browser or account) overrides this default.
        </p>
        <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
          {profiles.length === 0 ? (
            <p className="text-sm text-gray-500">No profiles available. Add profiles in the Profiles tab.</p>
          ) : (
            profiles.map((profile) => (
              <label
                key={profile.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded"
              >
                <input
                  type="checkbox"
                  checked={multipleProfileIds.has(profile.id)}
                  onChange={() => toggleMultipleProfile(profile.id)}
                  disabled={isSavingMultiple}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm">{profile.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveMultipleProfiles}
            disabled={isSavingMultiple || profiles.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSavingMultiple ? 'Saving...' : `Save (${multipleProfileIds.size} selected)`}
          </button>
        </div>
      </div>
    </div>
  );
}
