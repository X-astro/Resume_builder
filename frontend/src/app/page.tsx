'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  profilesApi,
  resumeApi,
  AIProvider,
  AIModelSettings,
  Profile,
  JobAnalysis,
} from '@/lib/api';
import ProfileSelector from '@/components/ProfileSelector';

type GenerateMode = 'single' | 'multiple';

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [generateMode, setGenerateMode] = useState<GenerateMode>('single');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIProvider>('openai');
  const [modelSettings, setModelSettings] = useState<AIModelSettings>({
    openaiEnabled: true,
    claudeEnabled: true,
  });
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [profilesData, modelData] = await Promise.all([
        profilesApi.getAll({ includeDisabled: true }),
        resumeApi.getModels().catch(() => ({ openaiEnabled: true, claudeEnabled: true })),
      ]);
      setProfiles(profilesData.filter((p) => !p.disabled));
      setModelSettings(modelData);
      if (!modelData.openaiEnabled && modelData.claudeEnabled) {
        setSelectedModel('claude');
      } else if (modelData.openaiEnabled && !modelData.claudeEnabled) {
        setSelectedModel('openai');
      }
      if (profilesData.length > 0) {
        setSelectedProfileId(profilesData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }
    if (!role.trim()) {
      setError('Please enter a role');
      return;
    }
    if (jobDescription.trim().length < 50) {
      setError('Please provide a job description (minimum 50 characters)');
      return;
    }
    if (generateMode === 'single' && !selectedProfileId) {
      setError('Please select a profile');
      return;
    }
    if (generateMode === 'multiple' && profiles.length === 0) {
      setError('No profiles available');
      return;
    }

    setIsGenerating(true);
    setError('');
    setSuccessMessage('');
    setJobAnalysis(null);

    try {
      setGenerationStep('Analyzing job description...');
      const analysis = await resumeApi.analyze(jobDescription, selectedModel);
      setJobAnalysis(analysis);

      if (generateMode === 'single') {
        setGenerationStep('Generating resume...');
        const profile = profiles.find((p) => p.id === selectedProfileId);
        const templateId = profile?.preferredTemplate || 'default';
        await resumeApi.generate({
          profileId: selectedProfileId!,
          templateId,
          jobDescription,
          jobAnalysis: analysis,
          companyName: companyName.trim(),
          role: role.trim(),
          model: selectedModel,
          format: 'both',
        });
        setSuccessMessage('Resume generated successfully.');
      } else {
        setGenerationStep(`Generating for ${profiles.length} profile(s)...`);
        const res = await resumeApi.generateAll({
          jobDescription,
          jobAnalysis: analysis,
          companyName: companyName.trim(),
          role: role.trim(),
          model: selectedModel,
          format: 'both',
        });
        setSuccessMessage(`Generated ${res.generated} resume(s) successfully.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate resume');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">
              Tailored Resume Builder
            </h1>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              Admin Panel
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Generate Resumes</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 font-bold">
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Generate mode: single or multiple */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Generate mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="generateMode"
                  value="single"
                  checked={generateMode === 'single'}
                  onChange={() => setGenerateMode('single')}
                  disabled={isGenerating}
                  className="w-4 h-4 text-blue-600"
                />
                <span>Single (one profile)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="generateMode"
                  value="multiple"
                  checked={generateMode === 'multiple'}
                  onChange={() => setGenerateMode('multiple')}
                  disabled={isGenerating}
                  className="w-4 h-4 text-blue-600"
                />
                <span>Multiple (all profiles)</span>
              </label>
            </div>
          </div>

          {generateMode === 'single' && (
            <ProfileSelector
              profiles={profiles}
              selectedId={selectedProfileId}
              onChange={setSelectedProfileId}
              isLoading={false}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isGenerating}
              placeholder="Enter company name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isGenerating}
              placeholder="Enter job role/title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={isGenerating}
              placeholder="Paste the job description (min 50 characters)"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <p className="text-sm text-gray-500 mt-1">{jobDescription.length} characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as AIProvider)}
              disabled={isGenerating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {modelSettings.openaiEnabled && <option value="openai">OpenAI</option>}
              {modelSettings.claudeEnabled && <option value="claude">Claude</option>}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                {generationStep || 'Generating...'}
              </>
            ) : (
              generateMode === 'single' ? 'Generate Resume' : `Generate All (${profiles.length} profiles)`
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        <p>Tailored Resume Builder - Powered by OpenAI and Anthropic</p>
      </footer>
    </div>
  );
}
