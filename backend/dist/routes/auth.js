"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userService_1 = require("../services/userService");
const userAuth_1 = require("../middleware/userAuth");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email?.trim()) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        if (!password || password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }
        const user = await (0, userService_1.createUser)({ email: email.trim(), password, name: name?.trim() });
        const token = (0, userAuth_1.generateUserToken)(user.id);
        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Registration failed',
        });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email?.trim() || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const user = await (0, userService_1.findByEmail)(email.trim());
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const valid = await (0, userService_1.validatePassword)(user, password);
        if (!valid) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const token = (0, userAuth_1.generateUserToken)(user.id);
        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map