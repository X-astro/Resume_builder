import fs from 'fs/promises';
import path from 'path';
import { Profile } from '../types/profile';
import { GENERATED_RESUMES_DIR } from '../config/storage';

const GENERATED_DIR = GENERATED_RESUMES_DIR;

function sanitizeFilename(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export interface GeneratedPathInfo {
  /** Relative path base: {profile}/{date}/{count+1}_{company}/{role} */
  relativeBase: string;
  /** Absolute directory for writing files */
  absoluteDir: string;
  profileSlug: string;
  companyFolderName: string;
  roleSlug: string;
}

/**
 * Compute output path for generated files.
 * Structure: {profile}/{date}/{count+1}_{company}/{role}/
 * Count = number of folders in {profile}/{date}, then create {count+1}_{companyname}
 */
export async function getGeneratedOutputPath(
  profile: Profile,
  companyName: string,
  role: string
): Promise<GeneratedPathInfo> {
  const profileSlug = sanitizeFilename(profile.name) || 'unknown';
  const companySlug = sanitizeFilename(companyName || 'unknown');
  const roleSlug = sanitizeFilename(role || 'resume');
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const profileDateDir = path.join(GENERATED_DIR, profileSlug, dateStr);
  let count = 0;
  try {
    const entries = await fs.readdir(profileDateDir, { withFileTypes: true });
    count = entries.filter((e) => e.isDirectory()).length;
  } catch {
    // Profile/date dir doesn't exist yet, count stays 0
  }

  const companyFolderName = `${String(count + 1).padStart(3, '0')}_${companySlug}`;
  const relativeBase = `${profileSlug}/${dateStr}/${companyFolderName}/${roleSlug}`;
  const absoluteDir = path.join(GENERATED_DIR, relativeBase);

  return { relativeBase, absoluteDir, profileSlug, companyFolderName, roleSlug };
}
