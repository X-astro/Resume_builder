"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENERATED_RESUMES_DIR = void 0;
const path_1 = __importDefault(require("path"));
// Project-level generated folder: {project_root}/generated/
const DEFAULT_GENERATED_RESUMES_DIR = path_1.default.join(__dirname, '..', '..', '..', 'generated');
exports.GENERATED_RESUMES_DIR = process.env.GENERATED_RESUMES_DIR?.trim() || DEFAULT_GENERATED_RESUMES_DIR;
//# sourceMappingURL=storage.js.map