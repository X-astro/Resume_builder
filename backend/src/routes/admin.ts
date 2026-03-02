import { Router, Request, Response } from 'express';
import { generateToken, validatePassword, invalidateToken, authMiddleware } from '../middleware/auth';
import { getAIModelSettings, updateAIModelSettings } from '../services/aiModelConfig';
import { getMultipleModeProfileIds, setMultipleModeProfileIds } from '../services/multipleProfilesConfig';
import { findAll, getUserMultipleProfileIds, setUserMultipleProfileIds } from '../services/userService';

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

// Get default Multiple mode profiles (protected)
router.get('/multiple-profiles', authMiddleware, async (req: Request, res: Response) => {
  try {
    const profileIds = await getMultipleModeProfileIds();
    res.json({ profileIds });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch multiple profiles config', profileIds: [] });
  }
});

// Update default Multiple mode profiles (protected)
router.put('/multiple-profiles', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { profileIds } = req.body as { profileIds?: unknown };
    const ids = Array.isArray(profileIds)
      ? profileIds.filter((id): id is string => typeof id === 'string')
      : [];
    const saved = await setMultipleModeProfileIds(ids);
    res.json({ profileIds: saved });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update multiple profiles config',
    });
  }
});

// List users (protected)
router.get('/users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const users = await findAll();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a user's multiple profile selection (protected)
router.get('/users/:userId/multiple-profiles', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const profileIds = await getUserMultipleProfileIds(userId);
    res.json({ profileIds });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profiles', profileIds: [] });
  }
});

// Set a user's multiple profile selection (protected)
router.put('/users/:userId/multiple-profiles', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const { profileIds } = req.body as { profileIds?: unknown };
    const ids = Array.isArray(profileIds)
      ? profileIds.filter((id): id is string => typeof id === 'string')
      : [];
    const saved = await setUserMultipleProfileIds(userId, ids);
    res.json({ profileIds: saved });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update user profiles',
    });
  }
});

export default router;
