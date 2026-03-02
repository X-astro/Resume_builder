import { Router, Request, Response } from 'express';
import { userAuthMiddleware } from '../middleware/userAuth';
import { findById, getUserMultipleProfileIds, setUserMultipleProfileIds } from '../services/userService';

const router = Router();

router.use(userAuthMiddleware);

router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.get('/me/multiple-profiles', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const profileIds = await getUserMultipleProfileIds(userId);
    res.json({ profileIds });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch multiple profiles', profileIds: [] });
  }
});

router.put('/me/multiple-profiles', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { profileIds } = req.body as { profileIds?: unknown };
    const ids = Array.isArray(profileIds)
      ? profileIds.filter((id): id is string => typeof id === 'string')
      : [];

    const saved = await setUserMultipleProfileIds(userId, ids);
    res.json({ profileIds: saved });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update multiple profiles',
    });
  }
});

export default router;
