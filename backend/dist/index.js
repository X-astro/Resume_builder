"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("./config/storage");
const profiles_1 = __importDefault(require("./routes/profiles"));
const templates_1 = __importDefault(require("./routes/templates"));
const resume_1 = __importDefault(require("./routes/resume"));
const admin_1 = __importDefault(require("./routes/admin"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const configuredFrontendOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://100.1.15.1:3000',
    ...configuredFrontendOrigins,
]);
// Middleware
app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Static files for generated resumes
app.use('/api/generated', express_1.default.static(storage_1.GENERATED_RESUMES_DIR));
// Routes
app.use('/api/profiles', profiles_1.default);
app.use('/api/templates', templates_1.default);
app.use('/api/resume', resume_1.default);
app.use('/api/admin', admin_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map