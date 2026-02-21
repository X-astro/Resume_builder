import path from 'path';

// Project-level generated folder: {project_root}/generated/
const DEFAULT_GENERATED_RESUMES_DIR = path.join(__dirname, '..', '..', '..', 'generated');

export const GENERATED_RESUMES_DIR =
  process.env.GENERATED_RESUMES_DIR?.trim() || DEFAULT_GENERATED_RESUMES_DIR;
