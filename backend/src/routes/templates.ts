import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import {
  extractAndSaveTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  createDefaultTemplate
} from '../services/templateExtractor';

const router = Router();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Get all templates
router.get('/', async (req: Request, res: Response) => {
  try {
    // Ensure default template exists
    await createDefaultTemplate();

    const includeDisabled = req.query.includeDisabled === 'true';
    const templates = await getAllTemplates();
    const filtered = includeDisabled
      ? templates
      : templates.filter((t) => !t.disabled);
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const template = await getTemplateById(req.params.id);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Upload PDF and extract template (protected)
router.post('/upload', authMiddleware, upload.single('pdf'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    const templateName = req.body.name || 'Untitled Template';

    const template = await extractAndSaveTemplate(
      req.file.buffer,
      templateName,
      req.file.originalname
    );

    res.status(201).json(template);
  } catch (error) {
    console.error('Error extracting template:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to extract template from PDF' 
    });
  }
});

// Update template (protected) - e.g. toggle disabled
router.patch('/:id', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { disabled } = req.body as { disabled?: boolean };
    const updated = await updateTemplate(req.params.id, { disabled });
    if (!updated) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (protected)
router.delete('/:id', authMiddleware, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const builtInTemplates = [
      'default', 'one-column', 'one-column-modern',
      'two-column-navy', 'one-column-emerald', 'one-column-violet', 'one-column-rose',
      'two-column-slate', 'one-column-amber', 'one-column-indigo', 'two-column-minimal',
      'one-column-serif', 'two-column-teal', 'one-column-coral', 'two-column-forest'
    ];
    if (builtInTemplates.includes(req.params.id)) {
      res.status(400).json({ error: 'Cannot delete built-in templates' });
      return;
    }

    const deleted = await deleteTemplate(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
