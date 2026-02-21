import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { analyzeJobDescription, tailorResume, resolveAIProvider } from '../services/claude';
import { generateResumePDF, generatePreviewHTML, getGeneratedPDFPath } from '../services/pdfGenerator';
import { getTemplateById, createDefaultTemplate } from '../services/templateExtractor';
import { getAIModelSettings, getDefaultEnabledProvider, isProviderEnabled } from '../services/aiModelConfig';
import { Profile } from '../types/profile';
import { AIProvider, GenerateResumeRequest } from '../types/template';

const router = Router();
const PROFILES_DIR = path.join(__dirname, '../../data/profiles');

// Get enabled AI models
router.get('/models', async (req: Request, res: Response) => {
  try {
    const settings = await getAIModelSettings();
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Failed to fetch AI model settings' });
  }
});

// Analyze job description
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { jobDescription, model } = req.body as { jobDescription?: string; model?: AIProvider | string };

    if (!jobDescription || jobDescription.trim().length < 50) {
      res.status(400).json({ error: 'Job description must be at least 50 characters' });
      return;
    }

    const settings = await getAIModelSettings();
    const requestedProvider = resolveAIProvider(model);
    const provider = isProviderEnabled(requestedProvider, settings)
      ? requestedProvider
      : getDefaultEnabledProvider(settings);
    const analysis = await analyzeJobDescription(jobDescription, provider);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing job description:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze job description' 
    });
  }
});

// Generate tailored resume
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      profileId,
      templateId,
      jobDescription,
      jobAnalysis,
      companyName,
      role,
      model
    }: GenerateResumeRequest = req.body;
    const settings = await getAIModelSettings();
    const selectedModel = resolveAIProvider(model);
    if (!isProviderEnabled(selectedModel, settings)) {
      res.status(400).json({ error: `Selected AI model '${selectedModel}' is disabled by admin` });
      return;
    }

    if (!profileId) {
      res.status(400).json({ error: 'Profile ID is required' });
      return;
    }

    if (!companyName || !companyName.trim()) {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }

    if (!role || !role.trim()) {
      res.status(400).json({ error: 'Role is required' });
      return;
    }

    // Load profile
    const profilePath = path.join(PROFILES_DIR, `${profileId}.json`);
    let profile: Profile;
    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      profile = JSON.parse(content);
    } catch {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    if (profile.disabled) {
      res.status(400).json({ error: 'Selected profile is disabled' });
      return;
    }

    // Ensure built-in templates exist, then load requested template
    await createDefaultTemplate();
    let template = await getTemplateById(templateId || 'default');
    if (!template) {
      template = await getTemplateById('default');
    }
    if (!template) {
      res.status(500).json({ error: 'Default template not available' });
      return;
    }
    if (template.disabled) {
      res.status(400).json({ error: 'Selected template is disabled' });
      return;
    }

    // If job description provided, tailor the resume
    let tailoredContent;
    if (jobDescription && jobDescription.trim().length > 50) {
      // Analyze job if not already analyzed
      const analysis = jobAnalysis || await analyzeJobDescription(jobDescription, selectedModel);
      tailoredContent = await tailorResume(profile, analysis, selectedModel);
    }

    // Generate PDF with company name and role
    const filename = await generateResumePDF(profile, template, tailoredContent, companyName.trim(), role.trim());

    res.json({
      filename,
      downloadUrl: `/api/generated/${filename}`,
      tailored: !!tailoredContent
    });
  } catch (error) {
    console.error('Error generating resume:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate resume'
    });
  }
});

// Preview resume HTML
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { profileId, templateId, jobDescription, jobAnalysis, model }: GenerateResumeRequest = req.body;
    const settings = await getAIModelSettings();
    const selectedModel = resolveAIProvider(model);
    if (!isProviderEnabled(selectedModel, settings)) {
      res.status(400).json({ error: `Selected AI model '${selectedModel}' is disabled by admin` });
      return;
    }

    if (!profileId) {
      res.status(400).json({ error: 'Profile ID is required' });
      return;
    }

    // Load profile
    const profilePath = path.join(PROFILES_DIR, `${profileId}.json`);
    let profile: Profile;
    try {
      const content = await fs.readFile(profilePath, 'utf-8');
      profile = JSON.parse(content);
    } catch {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    if (profile.disabled) {
      res.status(400).json({ error: 'Selected profile is disabled' });
      return;
    }

    // Ensure built-in templates exist, then load requested template
    await createDefaultTemplate();
    let template = await getTemplateById(templateId || 'default');
    if (!template) {
      template = await getTemplateById('default');
    }
    if (!template) {
      res.status(500).json({ error: 'Default template not available' });
      return;
    }
    if (template.disabled) {
      res.status(400).json({ error: 'Selected template is disabled' });
      return;
    }

    // If job description provided, tailor the resume
    let tailoredContent;
    if (jobDescription && jobDescription.trim().length > 50) {
      const analysis = jobAnalysis || await analyzeJobDescription(jobDescription, selectedModel);
      tailoredContent = await tailorResume(profile, analysis, selectedModel);
    }

    // Generate HTML preview
    const html = await generatePreviewHTML(profile, template, tailoredContent);

    res.json({ html, tailored: !!tailoredContent });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to generate preview' 
    });
  }
});

// Download generated PDF
router.get('/download/:filename', async (req: Request<{ filename: string }>, res: Response) => {
  try {
    const filepath = await getGeneratedPDFPath(req.params.filename);
    if (!filepath) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Set headers to force download
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.download(filepath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download file' });
  }
});

export default router;
