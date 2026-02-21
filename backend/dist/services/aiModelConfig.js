"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIModelSettings = getAIModelSettings;
exports.updateAIModelSettings = updateAIModelSettings;
exports.isProviderEnabled = isProviderEnabled;
exports.getDefaultEnabledProvider = getDefaultEnabledProvider;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const CONFIG_DIR = path_1.default.join(__dirname, '../../data/config');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'ai-models.json');
const DEFAULT_SETTINGS = {
    openaiEnabled: true,
    claudeEnabled: true,
};
function normalizeSettings(input, allowBothDisabled = false) {
    const normalized = {
        openaiEnabled: typeof input?.openaiEnabled === 'boolean' ? input.openaiEnabled : DEFAULT_SETTINGS.openaiEnabled,
        claudeEnabled: typeof input?.claudeEnabled === 'boolean' ? input.claudeEnabled : DEFAULT_SETTINGS.claudeEnabled,
    };
    // Never allow both to be disabled.
    if (!allowBothDisabled && !normalized.openaiEnabled && !normalized.claudeEnabled) {
        return DEFAULT_SETTINGS;
    }
    return normalized;
}
async function ensureConfigDir() {
    try {
        await promises_1.default.access(CONFIG_DIR);
    }
    catch {
        await promises_1.default.mkdir(CONFIG_DIR, { recursive: true });
    }
}
async function getAIModelSettings() {
    await ensureConfigDir();
    try {
        const raw = await promises_1.default.readFile(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const settings = normalizeSettings(parsed);
        // Self-heal invalid config on read.
        await promises_1.default.writeFile(CONFIG_FILE, JSON.stringify(settings, null, 2));
        return settings;
    }
    catch {
        await promises_1.default.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
        return DEFAULT_SETTINGS;
    }
}
async function updateAIModelSettings(input) {
    const current = await getAIModelSettings();
    const next = normalizeSettings({
        ...current,
        ...input,
    }, true);
    if (!next.openaiEnabled && !next.claudeEnabled) {
        throw new Error('At least one AI model must remain enabled');
    }
    await promises_1.default.writeFile(CONFIG_FILE, JSON.stringify(next, null, 2));
    return next;
}
function isProviderEnabled(provider, settings) {
    return provider === 'openai' ? settings.openaiEnabled : settings.claudeEnabled;
}
function getDefaultEnabledProvider(settings) {
    if (settings.openaiEnabled)
        return 'openai';
    return 'claude';
}
//# sourceMappingURL=aiModelConfig.js.map