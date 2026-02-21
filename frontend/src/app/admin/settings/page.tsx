'use client';

import { useEffect, useState } from 'react';
import { adminApi, AIModelSettings } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AIModelSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await adminApi.getAIModels();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
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
    </div>
  );
}
