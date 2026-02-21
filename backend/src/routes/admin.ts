import { Router, Request, Response } from 'express';
import { generateToken, validatePassword, invalidateToken, authMiddleware } from '../middleware/auth';
import { getAIModelSettings, updateAIModelSettings } from '../services/aiModelConfig';

const router = Router();

// Login
router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  if (!validatePassword(password)) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const token = generateToken();
  res.json({ token, message: 'Login successful' });
});

// Logout
router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    invalidateToken(token);
  }
  res.json({ message: 'Logout successful' });
});

// Verify token
router.get('/verify', authMiddleware, (req: Request, res: Response) => {
  res.json({ valid: true });
});

// Get AI model settings (protected)
router.get('/ai-models', authMiddleware, async (req: Request, res: Response) => {
  try {
    const settings = await getAIModelSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load AI model settings' });
  }
});

// Update AI model settings (protected)
router.put('/ai-models', authMiddleware, async (req: Request, res: Response) => {
  try {
    const settings = await updateAIModelSettings(req.body ?? {});
    res.json(settings);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update AI model settings',
    });
  }
});

export default router;
