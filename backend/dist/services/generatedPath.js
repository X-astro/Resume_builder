"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeneratedOutputPath = getGeneratedOutputPath;
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
 * Structure: {profile}/{date}/{company}/{role}/
 */
async function getGeneratedOutputPath(profile, companyName, role) {
    const profileSlug = sanitizeFilename(profile.name) || 'unknown';
    const companyFolderName = sanitizeFilename(companyName || 'unknown');
    const roleSlug = sanitizeFilename(role || 'resume');
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const relativeBase = `${profileSlug}/${dateStr}/${companyFolderName}/${roleSlug}`;
    const absoluteDir = path_1.default.join(GENERATED_DIR, relativeBase);
    return { relativeBase, absoluteDir, profileSlug, companyFolderName, roleSlug };
}
//# sourceMappingURL=generatedPath.js.map