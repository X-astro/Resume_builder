"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userAuth_1 = require("../middleware/userAuth");
const userService_1 = require("../services/userService");
const router = (0, express_1.Router)();
router.use(userAuth_1.userAuthMiddleware);
router.get('/me', async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const user = await (0, userService_1.findById)(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({ id: user.id, email: user.email, name: user.name });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
router.get('/me/multiple-profiles', async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const profileIds = await (0, userService_1.getUserMultipleProfileIds)(userId);
        res.json({ profileIds });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch multiple profiles', profileIds: [] });
    }
});
router.put('/me/multiple-profiles', async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { profileIds } = req.body;
        const ids = Array.isArray(profileIds)
            ? profileIds.filter((id) => typeof id === 'string')
            : [];
        const saved = await (0, userService_1.setUserMultipleProfileIds)(userId, ids);
        res.json({ profileIds: saved });
    }
    catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to update multiple profiles',
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map