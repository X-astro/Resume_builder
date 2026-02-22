"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const claude_1 = require("../services/claude");
const pdfGenerator_1 = require("../services/pdfGenerator");
const docxGenerator_1 = require("../services/docxGenerator");
const templateExtractor_1 = require("../services/templateExtractor");
const aiModelConfig_1 = require("../services/aiModelConfig");
const router = (0, express_1.Router)();
const PROFILES_DIR = path_1.default.join(__dirname, '../../data/profiles');
// Get enabled AI models
router.get('/models', async (req, res) => {
    try {
        const settings = await (0, aiModelConfig_1.getAIModelSettings)();
        res.json(settings);
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch AI model settings' });
    }
});
// Analyze job description
router.post('/analyze', async (req, res) => {
    try {
        const { jobDescription, model } = req.body;
        if (!jobDescription || jobDescription.trim().length < 50) {
            res.status(400).json({ error: 'Job description must be at least 50 characters' });
            return;
        }
        const settings = await (0, aiModelConfig_1.getAIModelSettings)();
        const requestedProvider = (0, claude_1.resolveAIProvider)(model);
        const provider = (0, aiModelConfig_1.isProviderEnabled)(requestedProvider, settings)
            ? requestedProvider
            : (0, aiModelConfig_1.getDefaultEnabledProvider)(settings);
        const analysis = await (0, claude_1.analyzeJobDescription)(jobDescription, provider);
        res.json(analysis);
    }
    catch (error) {
        console.error('Error analyzing job description:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to analyze job description'
        });
    }
});
// Generate tailored resume
router.post('/generate', async (req, res) => {
    try {
        const { profileId, templateId, jobDescription, jobAnalysis, companyName, role, model, format = 'pdf' } = req.body;
        const settings = await (0, aiModelConfig_1.getAIModelSettings)();
        const selectedModel = (0, claude_1.resolveAIProvider)(model);
        if (!(0, aiModelConfig_1.isProviderEnabled)(selectedModel, settings)) {
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
        const profilePath = path_1.default.join(PROFILES_DIR, `${profileId}.json`);
        let profile;
        try {
            const content = await promises_1.default.readFile(profilePath, 'utf-8');
            profile = JSON.parse(content);
        }
        catch {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        if (profile.disabled) {
            res.status(400).json({ error: 'Selected profile is disabled' });
            return;
        }
        // Ensure built-in templates exist, then load requested template
        await (0, templateExtractor_1.createDefaultTemplate)();
        let template = await (0, templateExtractor_1.getTemplateById)(templateId || 'default');
        if (!template) {
            template = await (0, templateExtractor_1.getTemplateById)('default');
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
            const analysis = jobAnalysis || await (0, claude_1.analyzeJobDescription)(jobDescription, selectedModel);
            tailoredContent = await (0, claude_1.tailorResume)(profile, analysis, selectedModel);
        }
        const generateBoth = format === 'both';
        if (generateBoth) {
            const [pdfFilename, docxFilename] = await Promise.all([
                (0, pdfGenerator_1.generateResumePDF)(profile, template, tailoredContent, companyName.trim(), role.trim()),
                (0, docxGenerator_1.generateResumeDOCX)(profile, tailoredContent, companyName.trim(), role.trim()),
            ]);
            res.json({
                pdf: { filename: pdfFilename, downloadUrl: `/api/generated/${pdfFilename}` },
                docx: { filename: docxFilename, downloadUrl: `/api/generated/${docxFilename}` },
                tailored: !!tailoredContent,
            });
        }
        else {
            const formatNorm = format === 'docx' ? 'docx' : 'pdf';
            const filename = formatNorm === 'docx'
                ? await (0, docxGenerator_1.generateResumeDOCX)(profile, tailoredContent, companyName.trim(), role.trim())
                : await (0, pdfGenerator_1.generateResumePDF)(profile, template, tailoredContent, companyName.trim(), role.trim());
            res.json({
                filename,
                downloadUrl: `/api/generated/${filename}`,
                tailored: !!tailoredContent,
                format: formatNorm
            });
        }
    }
    catch (error) {
        console.error('Error generating resume:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to generate resume'
        });
    }
});
// Preview resume HTML
router.post('/preview', async (req, res) => {
    try {
        const { profileId, templateId, jobDescription, jobAnalysis, model } = req.body;
        const settings = await (0, aiModelConfig_1.getAIModelSettings)();
        const selectedModel = (0, claude_1.resolveAIProvider)(model);
        if (!(0, aiModelConfig_1.isProviderEnabled)(selectedModel, settings)) {
            res.status(400).json({ error: `Selected AI model '${selectedModel}' is disabled by admin` });
            return;
        }
        if (!profileId) {
            res.status(400).json({ error: 'Profile ID is required' });
            return;
        }
        // Load profile
        const profilePath = path_1.default.join(PROFILES_DIR, `${profileId}.json`);
        let profile;
        try {
            const content = await promises_1.default.readFile(profilePath, 'utf-8');
            profile = JSON.parse(content);
        }
        catch {
            res.status(404).json({ error: 'Profile not found' });
            return;
        }
        if (profile.disabled) {
            res.status(400).json({ error: 'Selected profile is disabled' });
            return;
        }
        // Ensure built-in templates exist, then load requested template
        await (0, templateExtractor_1.createDefaultTemplate)();
        let template = await (0, templateExtractor_1.getTemplateById)(templateId || 'default');
        if (!template) {
            template = await (0, templateExtractor_1.getTemplateById)('default');
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
            const analysis = jobAnalysis || await (0, claude_1.analyzeJobDescription)(jobDescription, selectedModel);
            tailoredContent = await (0, claude_1.tailorResume)(profile, analysis, selectedModel);
        }
        // Generate HTML preview
        const html = await (0, pdfGenerator_1.generatePreviewHTML)(profile, template, tailoredContent);
        res.json({ html, tailored: !!tailoredContent });
    }
    catch (error) {
        console.error('Error generating preview:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to generate preview'
        });
    }
});
// Download generated resume (PDF or DOCX)
router.get('/download/:filename(*)', async (req, res) => {
    try {
        const filepath = await (0, pdfGenerator_1.getGeneratedPDFPath)(req.params.filename);
        if (!filepath) {
            res.status(404).json({ error: 'File not found' });
            return;
        }
        const ext = path_1.default.extname(req.params.filename).toLowerCase();
        const contentType = ext === '.docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf';
        res.setHeader('Content-Disposition', `attachment; filename="${path_1.default.basename(req.params.filename)}"`);
        res.setHeader('Content-Type', contentType);
        res.download(filepath);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to download file' });
    }
});
exports.default = router;
//# sourceMappingURL=resume.js.map