"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMultipleModeProfileIds = getMultipleModeProfileIds;
exports.setMultipleModeProfileIds = setMultipleModeProfileIds;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const CONFIG_DIR = path_1.default.join(__dirname, '../../data/config');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'multiple-profiles.json');
async function ensureConfigDir() {
    try {
        await promises_1.default.access(CONFIG_DIR);
    }
    catch {
        await promises_1.default.mkdir(CONFIG_DIR, { recursive: true });
    }
}
async function getMultipleModeProfileIds() {
    await ensureConfigDir();
    try {
        const raw = await promises_1.default.readFile(CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const ids = Array.isArray(parsed?.profileIds)
            ? parsed.profileIds.filter((id) => typeof id === 'string')
            : [];
        return ids;
    }
    catch {
        return [];
    }
}
async function setMultipleModeProfileIds(profileIds) {
    await ensureConfigDir();
    const ids = profileIds.filter((id) => typeof id === 'string');
    await promises_1.default.writeFile(CONFIG_FILE, JSON.stringify({ profileIds: ids }, null, 2));
    return ids;
}
//# sourceMappingURL=multipleProfilesConfig.js.map