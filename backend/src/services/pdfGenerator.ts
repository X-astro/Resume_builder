import puppeteer, { type Page } from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Profile } from '../types/profile';
import { TailoredContent, Template } from '../types/template';
import { GENERATED_RESUMES_DIR } from '../config/storage';
import type { GeneratedPathInfo } from './generatedPath';

const GENERATED_DIR = GENERATED_RESUMES_DIR;
const MAX_ROLE_BRIEF_LENGTH = 450;
const A4_PRINTABLE_WIDTH_PX = 698; // A4 width (8.27in) minus 0.5in margins on both sides at 96 DPI
const A4_PRINTABLE_HEIGHT_PX = 1026; // A4 height (11.69in) minus 0.5in margins top/bottom at 96 DPI
const OVERFLOW_TOLERANCE = 1.02; // Ignore tiny measurement drift
const SINGLE_PAGE_MAX_ATTEMPTS = 3;
const UNDERFLOW_THRESHOLD = 0.9; // If content is below 90% of page height, scale up
const TARGET_FILL_RATIO = 0.96; // Try to fill about 96% of printable height
const MAX_UPSCALE = 1.18; // Avoid overly large text
const SOFT_SKILL_SIGNALS = [
  'communication',
  'collaboration',
  'mindset',
  'mentality',
  'ownership',
  'autonomy',
  'independent',
  'self-directed',
  'adapt',
  'ambiguity',
  'passion',
  'attention to detail',
  'team player',
  'cross-functional',
  'stakeholder',
  'leadership',
  'problem-solving',
  'product-minded',
  'driving clarity',
  'transparency',
];
const LANGUAGE_SKILLS = new Set([
  'python',
  'javascript',
  'typescript',
  'java',
  'go',
  'golang',
  'rust',
  'ruby',
  'php',
  'c++',
  'c#',
  'kotlin',
  'swift',
  'scala',
  'sql',
  'html',
  'css',
  'elixir',
  'bash',
]);
const FRAMEWORK_SKILLS = new Set([
  'react',
  'react.js',
  'reactjs',
  'next',
  'next.js',
  'nextjs',
  'node',
  'node.js',
  'nodejs',
  'vue',
  'vue.js',
  'vuejs',
  'express',
  'express.js',
  'expressjs',
  'angular',
  'angular.js',
  'angularjs',
  'nest',
  'nestjs',
  'nest.js',
  'nuxt',
  'nuxt.js',
  'nuxtjs',
  'django',
  'flask',
  'fastapi',
  'fastify',
  'laravel',
  'rails',
  'spring',
  'spring boot',
  'springboot',
  'tensorflow',
  'pytorch',
  'torch',
  'keras',
  'scikit-learn',
  'sklearn',
  'pandas',
  'numpy',
  'redux',
  'react router',
  'tailwind',
  'tailwindcss',
  'mui',
  'material ui',
  'sass',
  'scss',
  'svelte',
  'svelte.js',
  'sveltejs',
  'ember',
  'ember.js',
  'emberjs',
  'jquery',
  'jquery.js',
  'jqueryjs',
  'bootstrap',
  'graphql',
  'swr',
  'flutter',
  'react native',
  'reactnative',
  '.net',
  'dotnet',
  'asp.net',
  'aspnet',
]);
const OTHER_TECH_SKILLS = new Set([
  'docker',
  'kubernetes',
  'k8s',
  'kube',
  'aws',
  'gcp',
  'azure',
  'git',
  'nginx',
  'redis',
  'celery',
  'postgres',
  'postgresql',
  'psql',
  'mongo',
  'mongodb',
  'mysql',
  'nosql',
  'openapi',
  'restful api',
  'rest api',
  'rest',
  'jwt',
  'oauth',
  'jest',
  'mocha',
  'chai',
  'ci/cd',
  'github actions',
  'gitlab ci',
  'vercel',
  'netlify',
  'figma',
  'sketch',
  'unix/linux',
  'linux',
  'rdbms/sql',
  'rdbms',
  'webpack',
  'vite',
  'gatsby',
  'eslint',
  'openai api',
  'llm',
  'terraform',
  'ansible',
  'jenkins',
  'kafka',
  'rabbitmq',
  'airflow',
  'dbt',
  'snowflake',
  'dynamodb',
]);

// Register Handlebars helpers
Handlebars.registerHelper('join', function(array: string[], separator: string) {
  if (!Array.isArray(array)) return '';
  return array.join(separator || ', ');
});

Handlebars.registerHelper('formatDate', function(date: string) {
  return date; // Keep as is for now
});

function normalizeSkills(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of skills) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function trimIncompleteEnd(s: string): string {
  return s.trim().replace(/,+\s*$/, '').replace(/\s+(and|or)\s*$/i, '').trim();
}

function clampRoleBrief(description: string): string {
  const clean = description.trim().replace(/\s+/g, ' ');
  if (clean.length <= MAX_ROLE_BRIEF_LENGTH) return trimIncompleteEnd(clean);
  const truncated = clean.slice(0, MAX_ROLE_BRIEF_LENGTH);
  let result: string;
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('! '),
    truncated.lastIndexOf('? ')
  );
  if (lastSentenceEnd >= MAX_ROLE_BRIEF_LENGTH - 80) {
    result = truncated.slice(0, lastSentenceEnd + 1).trim();
  } else {
    const lastComma = truncated.lastIndexOf(', ');
    if (lastComma >= MAX_ROLE_BRIEF_LENGTH - 50) {
      result = truncated.slice(0, lastComma).trim();
    } else {
      const lastSpace = truncated.trimEnd().lastIndexOf(' ');
      result = lastSpace > 0 && lastSpace >= MAX_ROLE_BRIEF_LENGTH - 40
        ? truncated.slice(0, lastSpace).trim()
        : truncated.trimEnd();
    }
  }
  return trimIncompleteEnd(result);
}

function normalizeExperienceDescriptions<T extends { experience?: Array<{ description?: string }> }>(data: T): T {
  const experience = Array.isArray(data.experience)
    ? data.experience.map((entry) => ({
      ...entry,
      description: clampRoleBrief(entry.description ?? ''),
    }))
    : data.experience;

  return {
    ...data,
    experience,
  };
}

function isTechnicalSkill(skill: string): boolean {
  const normalized = skill.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > 50 || /[.!?]/.test(normalized)) return false;

  const lower = normalized.toLowerCase();
  // Exclude soft skills (communication, collaboration, ownership, etc.)
  if (SOFT_SKILL_SIGNALS.some((signal) => lower.includes(signal))) return false;

  // Allow: known tech (languages, frameworks, tools) OR any skill that looks technical
  // Previously we only allowed whitelisted items, which dropped things like
  // "Backend development", "Event-driven architectures", "REST APIs"
  const inKnownSets =
    LANGUAGE_SKILLS.has(lower) ||
    FRAMEWORK_SKILLS.has(lower) ||
    OTHER_TECH_SKILLS.has(lower);
  if (inKnownSets) return true;

  // Allow skills containing common tech terms (architectures, tools, concepts)
  const techTerms = [
    'api', 'rest', 'graphql', 'backend', 'frontend', 'fullstack', 'full-stack',
    'microservice', 'event-driven', 'distributed', 'database', 'sql', 'etl',
    'devops', 'ci/cd', 'docker', 'kubernetes', 'aws', 'cloud', 'testing',
    'architecture', 'design', 'scalable', 'pipeline', 'monitoring',
    'python', 'javascript', 'typescript', 'react', 'django', 'node',
  ];
  return techTerms.some((term) => lower.includes(term));
}

function prioritizeSoftSkills(skills: string[]): string[] {
  const prioritized = skills.filter((skill) =>
    SOFT_SKILL_SIGNALS.some((signal) => skill.toLowerCase().includes(signal))
  );
  const remainder = skills.filter((skill) =>
    !SOFT_SKILL_SIGNALS.some((signal) => skill.toLowerCase().includes(signal))
  );
  return [...prioritized, ...remainder];
}

type SkillsData = {
  hardSkills?: string[];
  softSkills?: string[];
  skills?: string[];
};

function applySkillsLimit<T extends SkillsData>(data: T): T {
  // Merge required + preferred + hard (or legacy skills), then apply limits
  const MAX_SOFT_SKILLS = 10;

  const combinedHardRaw = data.hardSkills ?? data.skills ?? [];

  const hard = normalizeSkills(combinedHardRaw as unknown[]).filter(isTechnicalSkill);
  const soft = prioritizeSoftSkills(normalizeSkills(data.softSkills));
  const hardLimited = hard; // No limit on hard skills
  const availableSoftSlots = MAX_SOFT_SKILLS;
  const softLimited = soft.slice(0, availableSoftSlots);

  return {
    ...data,
    hardSkills: hardLimited,
    softSkills: softLimited,
    skills: hardLimited,
  } as T;
}

async function ensureGeneratedDir() {
  try {
    await fs.access(GENERATED_DIR);
  } catch {
    await fs.mkdir(GENERATED_DIR, { recursive: true });
  }
}

function sanitizeFilename(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

async function enforceSinglePageFit(page: Page): Promise<void> {
  await page.evaluate(() => {
    const doc = (globalThis as any).document;
    const body = doc?.body;
    if (!body) return;
    body.style.zoom = '1';
    body.style.transform = '';
    body.style.transformOrigin = '';
    body.style.width = '';
  });

  const layout = await page.evaluate(() => {
    const doc = (globalThis as any).document;
    const html = doc?.documentElement;
    const body = doc?.body;

    return {
      width: Math.max(
        html?.scrollWidth ?? 0,
        html?.clientWidth ?? 0,
        body?.scrollWidth ?? 0,
        body?.clientWidth ?? 0
      ),
      height: Math.max(
        html?.scrollHeight ?? 0,
        html?.clientHeight ?? 0,
        body?.scrollHeight ?? 0,
        body?.clientHeight ?? 0
      ),
    };
  });

  if (!layout.width || !layout.height) return;

  // Do NOT apply zoom. Template font sizes must render 1:1 in the PDF.
  // Previously we scaled down when overflowing (and up when underflowing),
  // which neutralized font-size changes. Now we render at actual size;
  // content may spill to page 2 if fonts are large or content is long.
}

async function countEstimatedPages(page: Page): Promise<number> {
  const scaledHeight = await page.evaluate(() => {
    const doc = (globalThis as any).document;
    const body = doc?.body;
    const html = doc?.documentElement;
    const bodyRectHeight = body?.getBoundingClientRect?.().height ?? 0;
    const htmlRectHeight = html?.getBoundingClientRect?.().height ?? 0;
    return Math.max(bodyRectHeight, htmlRectHeight);
  });

  if (!scaledHeight) return 1;
  return Math.max(1, Math.ceil(scaledHeight / A4_PRINTABLE_HEIGHT_PX));
}

function countPdfPages(pdfBuffer: Buffer): number {
  const content = pdfBuffer.toString('latin1');
  const matches = content.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 1;
}

function getResumeTitle(profile: Profile): string {
  const profileTitle = profile.title?.trim();
  if (profileTitle) return profileTitle;
  const lastRole = profile.experience?.[0]?.title?.trim();
  return lastRole || 'Professional';
}

/** Sanitize title for ATS: remove hyphens, periods, commas, and other symbols */
function sanitizeTitleForATS(title: string): string {
  return title
    .replace(/[-.,;:'"()\[\]\/\\@#$%&*+=<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function prepareResumeRenderData(
  profile: Profile,
  tailoredContent?: TailoredContent,
  companyName?: string,
  role?: string
) {
  const data = {
    ...profile,
    companyName: companyName || '',
    role: role || '',
    title: sanitizeTitleForATS(getResumeTitle(profile)),
    ...(tailoredContent && {
      summary: tailoredContent.summary,
      experience: tailoredContent.experience,
      skills: tailoredContent.skills || [],
      hardSkills: tailoredContent.hardSkills || [],
      softSkills: tailoredContent.softSkills || [],
      strengths: tailoredContent.strengths
    })
  };
  return normalizeExperienceDescriptions(applySkillsLimit(data));
}

export async function generateResumePDF(
  profile: Profile,
  template: Template,
  tailoredContent: TailoredContent | undefined,
  pathInfo: GeneratedPathInfo,
  companyName?: string,
  role?: string
): Promise<string> {
  await ensureGeneratedDir();

  const renderData = prepareResumeRenderData(
    profile,
    tailoredContent,
    companyName,
    role
  );

  // Compile and render template
  const compiledTemplate = Handlebars.compile(template.htmlContent);
  const html = compiledTemplate(renderData);

  // Add CSS if separate
  const fullHtml = template.cssContent
    ? `<style>${template.cssContent}</style>${html}`
    : html;

  // Generate PDF with Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: A4_PRINTABLE_WIDTH_PX,
      height: A4_PRINTABLE_HEIGHT_PX,
      deviceScaleFactor: 1,
    });
    await page.emulateMediaType('print');
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdfFilename = `${pathInfo.profileSlug}.pdf`;
    const relativePath = `${pathInfo.relativeBase}/${pdfFilename}`;
    const filepath = path.join(pathInfo.absoluteDir, pdfFilename);
    let finalPdf: Buffer | null = null;

    for (let attempt = 1; attempt <= SINGLE_PAGE_MAX_ATTEMPTS; attempt++) {
      await enforceSinglePageFit(page);

      // If still close to overflow, apply a tiny additional shrink on retry attempts.
      if (attempt > 1) {
        const nudgeScale = Math.max(0.92, 1 - attempt * 0.02);
        await page.evaluate((scale: number) => {
          const doc = (globalThis as any).document;
          const body = doc?.body;
          if (!body) return;
          const current = Number(body.style.zoom || '1') || 1;
          body.style.zoom = String(Math.min(current, current * scale));
        }, nudgeScale);
      }

      const estimatedPages = await countEstimatedPages(page);
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '0.4in',
          right: '0.5in',
          bottom: '0.3in',
          left: '0.5in'
        },
        printBackground: true
      });

      const actualPages = countPdfPages(Buffer.from(pdfBuffer));
      finalPdf = Buffer.from(pdfBuffer);

      if (estimatedPages <= 1 && actualPages <= 1) {
        break;
      }

      console.warn(
        `PDF exceeds one page (attempt ${attempt}/${SINGLE_PAGE_MAX_ATTEMPTS}, estimated=${estimatedPages}, actual=${actualPages}); regenerating.`
      );
    }

    if (!finalPdf) {
      throw new Error('Failed to generate PDF');
    }

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, finalPdf);

    return relativePath;
  } finally {
    await browser.close();
  }
}

export async function generatePreviewHTML(
  profile: Profile,
  template: Template,
  tailoredContent?: TailoredContent
): Promise<string> {
  const renderData = prepareResumeRenderData(profile, tailoredContent);

  // Compile and render template
  const compiledTemplate = Handlebars.compile(template.htmlContent);
  const html = compiledTemplate(renderData);

  // Add CSS if separate
  return template.cssContent 
    ? `<style>${template.cssContent}</style>${html}`
    : html;
}

export async function getGeneratedPDFPath(filename: string): Promise<string | null> {
  const filepath = path.join(GENERATED_DIR, filename);
  try {
    await fs.access(filepath);
    return filepath;
  } catch {
    return null;
  }
}
