'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  profilesApi,
  templatesApi,
  resumeApi,
  getApiOrigin,
  AIProvider,
  AIModelSettings,
  Profile,
  JobAnalysis,
  Template,
} from '@/lib/api';
import ProfileSelector from '@/components/ProfileSelector';
import TemplateSelector from '@/components/TemplateSelector';
import SkillsExtracted from '@/components/SkillsExtracted';
import ResumePreview from '@/components/ResumePreview';

export default function Home() {
  // Data states
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIProvider>('openai');
  const [modelSettings, setModelSettings] = useState<AIModelSettings>({
    openaiEnabled: true,
    claudeEnabled: true,
  });
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);

  // UI states
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [error, setError] = useState('');

  // Preview states
  const [previewHtml, setPreviewHtml] = useState('');
  const [downloadPdfUrl, setDownloadPdfUrl] = useState<string | null>(null);
  const [downloadDocxUrl, setDownloadDocxUrl] = useState<string | null>(null);
  const [isTailored, setIsTailored] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [profilesData, templatesData] = await Promise.all([
        profilesApi.getAll(),
        templatesApi.getAll(),
      ]);
      setProfiles(profilesData);
      setTemplates(templatesData);
      try {
        const modelData = await resumeApi.getModels();
        setModelSettings(modelData);
        if (!modelData.openaiEnabled && modelData.claudeEnabled) {
          setSelectedModel('claude');
        } else if (modelData.openaiEnabled && !modelData.claudeEnabled) {
          setSelectedModel('openai');
        }
      } catch {
        setModelSettings({ openaiEnabled: true, claudeEnabled: true });
      }

      // Auto-select first profile
      if (profilesData.length > 0) {
        const firstProfile = profilesData[0];
        setSelectedProfileId(firstProfile.id);
        const preferredTemplateExists = templatesData.some(
          (template) => template.id === firstProfile.preferredTemplate
        );
        if (preferredTemplateExists && firstProfile.preferredTemplate) {
          setSelectedTemplateId(firstProfile.preferredTemplate);
        } else if (templatesData.some((template) => template.id === 'default')) {
          setSelectedTemplateId('default');
        } else if (templatesData.length > 0) {
          setSelectedTemplateId(templatesData[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    const selectedProfile = profiles.find((profile) => profile.id === profileId);
    const preferredTemplateExists = templates.some(
      (template) => template.id === selectedProfile?.preferredTemplate
    );
    if (preferredTemplateExists && selectedProfile?.preferredTemplate) {
      setSelectedTemplateId(selectedProfile.preferredTemplate);
    }
  };

  const handleGenerateResume = async () => {
    if (!selectedProfileId) {
      setError('Please select a profile');
      return;
    }

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

    setIsGenerating(true);
    setError('');
    setJobAnalysis(null);
    const templateId = selectedTemplateId || 'default';

    try {
      let analysis: JobAnalysis | undefined;

      // Step 1: Analyze job description
      setGenerationStep('Analyzing job description...');
      analysis = await resumeApi.analyze(jobDescription, selectedModel);
      setJobAnalysis(analysis);

      // Step 2: Generate preview and PDF
      setGenerationStep('Tailoring resume content...');

      const previewResponse = await resumeApi.preview({
        profileId: selectedProfileId,
        templateId,
        jobDescription,
        jobAnalysis: analysis,
        model: selectedModel,
      });
      setPreviewHtml(previewResponse.html);
      setIsTailored(previewResponse.tailored);

      setGenerationStep('Generating PDF and DOCX...');

      const generateResponse = await resumeApi.generate({
        profileId: selectedProfileId,
        templateId,
        jobDescription,
        jobAnalysis: analysis,
        companyName: companyName.trim(),
        role: role.trim(),
        model: selectedModel,
        format: 'both',
      });

      const base = getApiOrigin();
      if ('pdf' in generateResponse && 'docx' in generateResponse) {
        setDownloadPdfUrl(`${base}${generateResponse.pdf.downloadUrl}`);
        setDownloadDocxUrl(`${base}${generateResponse.docx.downloadUrl}`);
      } else {
        setDownloadPdfUrl(null);
        setDownloadDocxUrl(null);
      }

      setGenerationStep('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate resume');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(objectUrl);
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download resume');
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError('')}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Profile Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Resume Settings
              </h2>
              <ProfileSelector
                profiles={profiles}
                selectedId={selectedProfileId}
                onChange={handleProfileChange}
                isLoading={isLoadingData}
              />
              <TemplateSelector
                templates={templates}
                selectedId={selectedTemplateId}
                onChange={setSelectedTemplateId}
                isLoading={isLoadingData || templates.length === 0}
                disabled={!!profiles.find((p) => p.id === selectedProfileId)?.preferredTemplate}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as AIProvider)}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {modelSettings.openaiEnabled && (
                    <option value="openai">OpenAI</option>
                  )}
                  {modelSettings.claudeEnabled && (
                    <option value="claude">Claude</option>
                  )}
                </select>
              </div>
            </div>

            {/* Job Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Job Details
              </h2>
              
              {/* Company Name */}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              {/* Role */}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
              
              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Paste the job description to automatically tailor your resume with
                  relevant keywords for better ATS scoring.
                </p>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={isGenerating}
                  placeholder="Paste the job description here..."
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {jobDescription.length > 0
                    ? `${jobDescription.length} characters`
                    : 'Minimum 50 characters for ATS optimization'}
                </p>
              </div>
            </div>

            {/* Job Analysis Results */}
            {jobAnalysis && <SkillsExtracted analysis={jobAnalysis} />}
          </div>

          {/* Right Column - Preview */}
          <div>
            <ResumePreview
              html={previewHtml}
              downloadPdfUrl={downloadPdfUrl}
              downloadDocxUrl={downloadDocxUrl}
              onDownloadPdf={() => handleDownload(downloadPdfUrl!, downloadPdfUrl?.split('/').pop() || 'resume.pdf')}
              onDownloadDocx={() => handleDownload(downloadDocxUrl!, downloadDocxUrl?.split('/').pop() || 'resume.docx')}
              onGenerate={handleGenerateResume}
              isGenerating={isGenerating}
              isTailored={isTailored}
              generationStep={generationStep}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How to Use
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Select your profile from the dropdown</li>
            <li>Select your preferred resume style from the template dropdown</li>
            <li>
              <strong>Optional:</strong> Paste a job description to enable ATS
              optimization
            </li>
            <li>
              Click &quot;Generate Resume&quot; - the system will automatically
              analyze the job and create your tailored resume
            </li>
            <li>Download your ATS-optimized resume!</li>
          </ol>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        <p>Tailored Resume Builder - Powered by OpenAI and Anthropic</p>
      </footer>
    </div>
  );
}
