"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const templateExtractor_1 = require("../services/templateExtractor");
const pdfGenerator_1 = require("../services/pdfGenerator");
const router = (0, express_1.Router)();
// Configure multer for PDF uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});
// Get all templates
router.get('/', async (req, res) => {
    try {
        // Ensure default template exists
        await (0, templateExtractor_1.createDefaultTemplate)();
        const includeDisabled = req.query.includeDisabled === 'true';
        const templates = await (0, templateExtractor_1.getAllTemplates)();
        const filtered = includeDisabled
            ? templates
            : templates.filter((t) => !t.disabled);
        res.json(filtered);
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});
// Preview template with placeholder data (for admin display)
const PLACEHOLDER_PROFILE = {
    id: 'preview',
    name: 'Your Name',
    title: 'Professional Title',
    totalYearsExperience: 5,
    contact: { phone: '(555) 123-4567', email: 'you@example.com', location: 'City, State' },
    summary: 'Professional summary placeholder for template preview.',
    experience: [
        {
            title: 'Senior Role',
            company: 'Company Name',
            startDate: '01/2020',
            endDate: 'Present',
            location: 'City, State',
            description: 'Role description',
            achievements: ['Key achievement 1', 'Key achievement 2'],
        },
    ],
    strengths: [{ title: 'Strength', description: 'Description of strength.' }],
    skills: ['Skill 1', 'Skill 2', 'Skill 3'],
    education: [
        { degree: 'Bachelor of Science', institution: 'University Name', startDate: '2015', endDate: '2019', location: 'City' },
    ],
    createdAt: '',
    updatedAt: '',
};
router.get('/preview/:id', async (req, res) => {
    try {
        const id = decodeURIComponent(req.params.id);
        const template = await (0, templateExtractor_1.getTemplateById)(id);
        if (!template) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }
        const html = await (0, pdfGenerator_1.generatePreviewHTML)(PLACEHOLDER_PROFILE, template);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    }
    catch (error) {
        console.error('Error generating template preview:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});
// Get single template (id may contain slashes, e.g. m/one-clean)
router.get('/:id', async (req, res) => {
    try {
        const id = decodeURIComponent(req.params.id);
        const template = await (0, templateExtractor_1.getTemplateById)(id);
        if (!template) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }
        res.json(template);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});
// Upload PDF and extract template (protected)
router.post('/upload', auth_1.authMiddleware, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No PDF file uploaded' });
            return;
        }
        const templateName = req.body.name || 'Untitled Template';
        const template = await (0, templateExtractor_1.extractAndSaveTemplate)(req.file.buffer, templateName, req.file.originalname);
        res.status(201).json(template);
    }
    catch (error) {
        console.error('Error extracting template:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to extract template from PDF'
        });
    }
});
// Update template (protected) - e.g. toggle disabled
router.patch('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const id = decodeURIComponent(req.params.id);
        const { disabled } = req.body;
        const updated = await (0, templateExtractor_1.updateTemplate)(id, { disabled });
        if (!updated) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});
// Delete template (protected)
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const id = decodeURIComponent(req.params.id);
        const builtInTemplates = [
            'default', 'one-column', 'one-column-modern',
            'two-column-navy', 'one-column-emerald', 'one-column-violet', 'one-column-rose',
            'two-column-slate', 'one-column-amber', 'one-column-indigo', 'two-column-minimal',
            'one-column-serif', 'two-column-teal', 'one-column-coral', 'two-column-forest'
        ];
        if (builtInTemplates.includes(id)) {
            res.status(400).json({ error: 'Cannot delete built-in templates' });
            return;
        }
        const deleted = await (0, templateExtractor_1.deleteTemplate)(id);
        if (!deleted) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }
        res.json({ message: 'Template deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete template' });
    }
});
exports.default = router;
//# sourceMappingURL=templates.js.map