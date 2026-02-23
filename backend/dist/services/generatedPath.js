"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeneratedOutputPath = getGeneratedOutputPath;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("../config/storage");
const GENERATED_DIR = storage_1.GENERATED_RESUMES_DIR;
function sanitizeFilename(str) {
    return str
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}
/**
 * Compute output path for generated files.
 * Structure: {profile}/{date}/{count+1}_{company}/{role}/
 * Count = number of folders in {profile}/{date}, then create {count+1}_{companyname}
 */
async function getGeneratedOutputPath(profile, companyName, role) {
    const profileSlug = sanitizeFilename(profile.name) || 'unknown';
    const companySlug = sanitizeFilename(companyName || 'unknown');
    const roleSlug = sanitizeFilename(role || 'resume');
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const profileDateDir = path_1.default.join(GENERATED_DIR, profileSlug, dateStr);
    let count = 0;
    try {
        const entries = await promises_1.default.readdir(profileDateDir, { withFileTypes: true });
        count = entries.filter((e) => e.isDirectory()).length;
    }
    catch {
        // Profile/date dir doesn't exist yet, count stays 0
    }
    const companyFolderName = `${String(count + 1).padStart(3, '0')}_${companySlug}`;
    const relativeBase = `${profileSlug}/${dateStr}/${companyFolderName}/${roleSlug}`;
    const absoluteDir = path_1.default.join(GENERATED_DIR, relativeBase);
    return { relativeBase, absoluteDir, profileSlug, companyFolderName, roleSlug };
}
//# sourceMappingURL=generatedPath.js.map