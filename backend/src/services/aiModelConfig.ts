import fs from 'fs/promises';
import path from 'path';
import { AIProvider } from '../types/template';

export type AIModelSettings = {
  openaiEnabled: boolean;
  claudeEnabled: boolean;
};

const CONFIG_DIR = path.join(__dirname, '../../data/config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'ai-models.json');

const DEFAULT_SETTINGS: AIModelSettings = {
  openaiEnabled: true,
  claudeEnabled: true,
};

function normalizeSettings(input: Partial<AIModelSettings> | undefined, allowBothDisabled = false): AIModelSettings {
  const normalized: AIModelSettings = {
    openaiEnabled: typeof input?.openaiEnabled === 'boolean' ? input.openaiEnabled : DEFAULT_SETTINGS.openaiEnabled,
    claudeEnabled: typeof input?.claudeEnabled === 'boolean' ? input.claudeEnabled : DEFAULT_SETTINGS.claudeEnabled,
  };

  // Never allow both to be disabled.
  if (!allowBothDisabled && !normalized.openaiEnabled && !normalized.claudeEnabled) {
    return DEFAULT_SETTINGS;
  }

  return normalized;
}

async function ensureConfigDir(): Promise<void> {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

export async function getAIModelSettings(): Promise<AIModelSettings> {
  await ensureConfigDir();
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AIModelSettings>;
    const settings = normalizeSettings(parsed);
    // Self-heal invalid config on read.
    await fs.writeFile(CONFIG_FILE, JSON.stringify(settings, null, 2));
    return settings;
  } catch {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return DEFAULT_SETTINGS;
  }
}

export async function updateAIModelSettings(input: Partial<AIModelSettings>): Promise<AIModelSettings> {
  const current = await getAIModelSettings();
  const next = normalizeSettings({
    ...current,
    ...input,
  }, true);

  if (!next.openaiEnabled && !next.claudeEnabled) {
    throw new Error('At least one AI model must remain enabled');
  }

  await fs.writeFile(CONFIG_FILE, JSON.stringify(next, null, 2));
  return next;
}

export function isProviderEnabled(provider: AIProvider, settings: AIModelSettings): boolean {
  return provider === 'openai' ? settings.openaiEnabled : settings.claudeEnabled;
}

export function getDefaultEnabledProvider(settings: AIModelSettings): AIProvider {
  if (settings.openaiEnabled) return 'openai';
  return 'claude';
}
