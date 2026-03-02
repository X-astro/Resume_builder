import fs from 'fs/promises';
import path from 'path';

const CONFIG_DIR = path.join(__dirname, '../../data/config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'multiple-profiles.json');

async function ensureConfigDir(): Promise<void> {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

export async function getMultipleModeProfileIds(): Promise<string[]> {
  await ensureConfigDir();
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as { profileIds?: unknown };
    const ids = Array.isArray(parsed?.profileIds)
      ? parsed.profileIds.filter((id): id is string => typeof id === 'string')
      : [];
    return ids;
  } catch {
    return [];
  }
}

export async function setMultipleModeProfileIds(profileIds: string[]): Promise<string[]> {
  await ensureConfigDir();
  const ids = profileIds.filter((id) => typeof id === 'string');
  await fs.writeFile(CONFIG_FILE, JSON.stringify({ profileIds: ids }, null, 2));
  return ids;
}
