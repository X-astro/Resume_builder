import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { analyzeJobDescription, tailorResume, generateCoverLetter, resolveAIProvider } from '../services/claude';
import { generateResumePDF, generatePreviewHTML, getGeneratedPDFPath } from '../services/pdfGenerator';
import { generateResumeDOCX } from '../services/docxGenerator';
import { saveCoverLetter, saveCoverLetterDOCX } from '../services/coverLetterGenerator';
import { getGeneratedOutputPath } from '../services/generatedPath';
import { getTemplateById, createDefaultTemplate } from '../services/templateExtractor';
import { getAIModelSettings, getDefaultEnabledProvider, isProviderEnabled } from '../services/aiModelConfig';
import { getMultipleModeProfileIds } from '../services/multipleProfilesConfig';
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

// Get default profile IDs for Multiple mode (public - used by main page)
router.get('/default-multiple-profiles', async (req: Request, res: Response) => {
  try {
    const profileIds = await getMultipleModeProfileIds();
    res.json({ profileIds });
  } catch {
    res.status(500).json({ error: 'Failed to fetch default multiple profiles', profileIds: [] });
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

// Load all non-disabled profiles
async function loadAllProfiles(): Promise<Profile[]> {
  const files = await fs.readdir(PROFILES_DIR);
  const profiles: Profile[] = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const content = await fs.readFile(path.join(PROFILES_DIR, file), 'utf-8');
        const profile = JSON.parse(content);
        if (!profile.disabled) profiles.push(profile);
      } catch {
        // Skip invalid profile files
      }
    }
  }
  return profiles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Generate for multiple profiles (all or selected)
router.post('/generate-all', async (req: Request, res: Response) => {
  try {
    const {
      templateId,
      jobDescription,
      jobAnalysis,
      companyName,
      role,
      model,
      format = 'both',
      profileIds: requestedProfileIds,
    } = req.body;

    const settings = await getAIModelSettings();
    const selectedModel = resolveAIProvider(model);
    if (!isProviderEnabled(selectedModel, settings)) {
      res.status(400).json({ error: `Selected AI model '${selectedModel}' is disabled by admin` });
      return;
    }
    if (!companyName?.trim()) {
      res.status(400).json({ error: 'Company name is required' });
      return;
    }
    if (!role?.trim()) {
      res.status(400).json({ error: 'Role is required' });
      return;
    }

    let profiles = await loadAllProfiles();
    if (Array.isArray(requestedProfileIds) && requestedProfileIds.length > 0) {
      const idSet = new Set(requestedProfileIds.filter((id: unknown) => typeof id === 'string'));
      profiles = profiles.filter((p) => idSet.has(p.id));
    }
    if (profiles.length === 0) {
      res.status(400).json({ error: 'No profiles available. Add or select profiles.' });
      return;
    }

    await createDefaultTemplate();

    let analysis: import('../types/template').JobAnalysis | undefined;
    if (jobDescription?.trim().length > 50) {
      analysis = jobAnalysis || await analyzeJobDescription(jobDescription, selectedModel);
    }

    const results: { profileId: string; profileName: string; pdf?: string; docx?: string; coverLetterPdf?: string; coverLetterDocx?: string }[] = [];
    const formatNorm = (format as string) === 'both' ? 'both' : format === 'docx' ? 'docx' : 'pdf';

    for (const profile of profiles) {
      const profileTemplateId = profile.preferredTemplate || templateId || 'default';
      let template = await getTemplateById(profileTemplateId);
      if (!template || template.disabled) template = await getTemplateById('default');
      if (!template || template.disabled) {
        res.status(500).json({ error: 'Default template not available' });
        return;
      }

      let tailoredContent;
      if (analysis) {
        tailoredContent = await tailorResume(profile, analysis, selectedModel);
      }
      let coverLetterBody: string;
      if (tailoredContent?.coverLetter?.trim()) {
        coverLetterBody = tailoredContent.coverLetter.trim();
      } else {
        coverLetterBody = await generateCoverLetter(profile, companyName.trim(), role.trim(), selectedModel);
      }
      const pathInfo = await getGeneratedOutputPath(profile, companyName.trim(), role.trim());
      const [coverLetterPdfPath, coverLetterDocxPath] = await Promise.all([
        saveCoverLetter(profile, coverLetterBody, pathInfo),
        saveCoverLetterDOCX(profile, coverLetterBody, pathInfo),
      ]);

      const entry: (typeof results)[0] = {
        profileId: profile.id,
        profileName: profile.name,
        coverLetterPdf: coverLetterPdfPath,
        coverLetterDocx: coverLetterDocxPath,
      };
      if (formatNorm === 'both') {
        const [pdfFilename, docxFilename] = await Promise.all([
          generateResumePDF(profile, template, tailoredContent, pathInfo, companyName.trim(), role.trim()),
          generateResumeDOCX(profile, tailoredContent, pathInfo, companyName.trim(), role.trim())
        ]);
        entry.pdf = pdfFilename;
        entry.docx = docxFilename;
      } else {
        const filename = formatNorm === 'docx'
          ? await generateResumeDOCX(profile, tailoredContent, pathInfo, companyName.trim(), role.trim())
          : await generateResumePDF(profile, template, tailoredContent, pathInfo, companyName.trim(), role.trim());
        entry[formatNorm] = filename;
      }
      results.push(entry);
    }

    res.json({ generated: results.length, results, tailored: !!analysis });
  } catch (error) {
    console.error('Error generating resumes for all profiles:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate resumes'
    });
  }
});

// Generate tailored resume (single profile)
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      profileId,
      templateId,
      jobDescription,
      jobAnalysis,
      companyName,
      role,
      model,
      format = 'pdf'
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

    const generateBoth = (format as string) === 'both';

    // Get cover letter body: from tailored content or generate when no job description
    let coverLetterBody: string;
    if (tailoredContent?.coverLetter?.trim()) {
      coverLetterBody = tailoredContent.coverLetter.trim();
    } else {
      coverLetterBody = await generateCoverLetter(
        profile,
        companyName.trim(),
        role.trim(),
        selectedModel
      );
    }

    const pathInfo = await getGeneratedOutputPath(
      profile,
      companyName.trim(),
      role.trim()
    );
    const [coverLetterPdfPath, coverLetterDocxPath] = await Promise.all([
      saveCoverLetter(profile, coverLetterBody, pathInfo),
      saveCoverLetterDOCX(profile, coverLetterBody, pathInfo),
    ]);

    if (generateBoth) {
      const [pdfFilename, docxFilename] = await Promise.all([
        generateResumePDF(profile, template, tailoredContent, pathInfo, companyName.trim(), role.trim()),
        generateResumeDOCX(profile, tailoredContent, pathInfo, companyName.trim(), role.trim()),
      ]);
      res.json({
        pdf: { filename: pdfFilename, downloadUrl: `/api/generated/${pdfFilename}` },
        docx: { filename: docxFilename, downloadUrl: `/api/generated/${docxFilename}` },
        coverLetter: {
          pdf: { filename: coverLetterPdfPath, downloadUrl: `/api/generated/${coverLetterPdfPath}` },
          docx: { filename: coverLetterDocxPath, downloadUrl: `/api/generated/${coverLetterDocxPath}` },
        },
        tailored: !!tailoredContent,
      });
    } else {
      const formatNorm = format === 'docx' ? 'docx' : 'pdf';
      const filename =
        formatNorm === 'docx'
          ? await generateResumeDOCX(profile, tailoredContent, pathInfo, companyName.trim(), role.trim())
          : await generateResumePDF(profile, template, tailoredContent, pathInfo, companyName.trim(), role.trim());

      res.json({
        filename,
        downloadUrl: `/api/generated/${filename}`,
        coverLetter: {
          pdf: { filename: coverLetterPdfPath, downloadUrl: `/api/generated/${coverLetterPdfPath}` },
          docx: { filename: coverLetterDocxPath, downloadUrl: `/api/generated/${coverLetterDocxPath}` },
        },
        tailored: !!tailoredContent,
        format: formatNorm
      });
    }
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

// Download generated resume (PDF or DOCX)
router.get('/download/:filename(*)', async (req: Request<{ filename: string }>, res: Response) => {
  try {
    const filepath = await getGeneratedPDFPath(req.params.filename);
    if (!filepath) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const ext = path.extname(req.params.filename).toLowerCase();
    const contentType =
      ext === '.docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';

    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(req.params.filename)}"`);
    res.setHeader('Content-Type', contentType);
    res.download(filepath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download file' });
  }
});

export default router;
