"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const aiModelConfig_1 = require("../services/aiModelConfig");
const multipleProfilesConfig_1 = require("../services/multipleProfilesConfig");
const router = (0, express_1.Router)();
// Login
router.post('/login', (req, res) => {
    const { password } = req.body;
    if (!password) {
        res.status(400).json({ error: 'Password is required' });
        return;
    }
    if (!(0, auth_1.validatePassword)(password)) {
        res.status(401).json({ error: 'Invalid password' });
        return;
    }
    const token = (0, auth_1.generateToken)();
    res.json({ token, message: 'Login successful' });
});
// Logout
router.post('/logout', auth_1.authMiddleware, (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        (0, auth_1.invalidateToken)(token);
    }
    res.json({ message: 'Logout successful' });
});
// Verify token
router.get('/verify', auth_1.authMiddleware, (req, res) => {
    res.json({ valid: true });
});
// Get AI model settings (protected)
router.get('/ai-models', auth_1.authMiddleware, async (req, res) => {
    try {
        const settings = await (0, aiModelConfig_1.getAIModelSettings)();
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to load AI model settings' });
    }
});
// Update AI model settings (protected)
router.put('/ai-models', auth_1.authMiddleware, async (req, res) => {
    try {
        const settings = await (0, aiModelConfig_1.updateAIModelSettings)(req.body ?? {});
        res.json(settings);
    }
    catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to update AI model settings',
        });
    }
});
// Get default Multiple mode profiles (protected)
router.get('/multiple-profiles', auth_1.authMiddleware, async (req, res) => {
    try {
        const profileIds = await (0, multipleProfilesConfig_1.getMultipleModeProfileIds)();
        res.json({ profileIds });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch multiple profiles config', profileIds: [] });
    }
});
// Update default Multiple mode profiles (protected)
router.put('/multiple-profiles', auth_1.authMiddleware, async (req, res) => {
    try {
        const { profileIds } = req.body;
        const ids = Array.isArray(profileIds)
            ? profileIds.filter((id) => typeof id === 'string')
            : [];
        const saved = await (0, multipleProfilesConfig_1.setMultipleModeProfileIds)(ids);
        res.json({ profileIds: saved });
    }
    catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Failed to update multiple profiles config',
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map