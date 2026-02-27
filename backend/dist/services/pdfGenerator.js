"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareResumeRenderData = prepareResumeRenderData;
exports.generateResumePDF = generateResumePDF;
exports.generatePreviewHTML = generatePreviewHTML;
exports.generateTemplatePreviewHTML = generateTemplatePreviewHTML;
exports.getGeneratedPDFPath = getGeneratedPDFPath;
const puppeteer_1 = __importDefault(require("puppeteer"));
const handlebars_1 = __importDefault(require("handlebars"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("../config/storage");
const GENERATED_DIR = storage_1.GENERATED_RESUMES_DIR;
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
handlebars_1.default.registerHelper('join', function (array, separator) {
    if (!Array.isArray(array))
        return '';
    return array.join(separator || ', ');
});
handlebars_1.default.registerHelper('formatDate', function (date) {
    return date; // Keep as is for now
});
function normalizeSkills(skills) {
    if (!Array.isArray(skills))
        return [];
    const seen = new Set();
    const result = [];
    for (const entry of skills) {
        if (typeof entry !== 'string')
            continue;
        const trimmed = entry.trim();
        if (!trimmed)
            continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(trimmed);
    }
    return result;
}
function trimIncompleteEnd(s) {
    return s.trim().replace(/,+\s*$/, '').replace(/\s+(and|or)\s*$/i, '').trim();
}
function clampRoleBrief(description) {
    const clean = description.trim().replace(/\s+/g, ' ');
    if (clean.length <= MAX_ROLE_BRIEF_LENGTH)
        return trimIncompleteEnd(clean);
    const truncated = clean.slice(0, MAX_ROLE_BRIEF_LENGTH);
    let result;
    const lastSentenceEnd = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('! '), truncated.lastIndexOf('? '));
    if (lastSentenceEnd >= MAX_ROLE_BRIEF_LENGTH - 80) {
        result = truncated.slice(0, lastSentenceEnd + 1).trim();
    }
    else {
        const lastComma = truncated.lastIndexOf(', ');
        if (lastComma >= MAX_ROLE_BRIEF_LENGTH - 50) {
            result = truncated.slice(0, lastComma).trim();
        }
        else {
            const lastSpace = truncated.trimEnd().lastIndexOf(' ');
            result = lastSpace > 0 && lastSpace >= MAX_ROLE_BRIEF_LENGTH - 40
                ? truncated.slice(0, lastSpace).trim()
                : truncated.trimEnd();
        }
    }
    return trimIncompleteEnd(result);
}
function normalizeExperienceDescriptions(data) {
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
const JOB_TITLE_EXCLUSIONS = new Set([
    'full stack developer', 'fullstack developer', 'full-stack developer',
    'frontend developer', 'front-end developer',
    'backend developer', 'back-end developer',
    'full stack engineer', 'frontend engineer', 'backend engineer',
    'software developer', 'software engineer',
]);
function capitalizeHardSkill(s) {
    if (!s || s.length === 0)
        return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}
const MAX_SOFT_SKILL_LENGTH = 30;
const SOFT_SKILL_CONDENSE = [
    { patterns: ['excellent communication', 'communication and collaboration', 'communication skills'], key: 'Communication' },
    { patterns: ['collaboration', 'collaborative'], key: 'Collaboration' },
    { patterns: ['cross-functional', 'cross functional'], key: 'Cross-functional' },
    { patterns: ['problem-solving', 'problem solving'], key: 'Problem-solving' },
    { patterns: ['ownership', 'high ownership'], key: 'Ownership' },
    { patterns: ['autonomy', 'self-directed', 'independent'], key: 'Autonomy' },
    { patterns: ['transparency', 'transparent'], key: 'Transparency' },
    { patterns: ['reliability', 'reliable'], key: 'Reliability' },
    { patterns: ['supportive', 'support'], key: 'Supportive' },
    { patterns: ['passionate', 'passion'], key: 'Passion' },
    { patterns: ['mentorship', 'mentor', 'help fellow'], key: 'Mentorship' },
    { patterns: ['adaptability', 'adapt'], key: 'Adaptability' },
    { patterns: ['eager to learn', 'lifelong learning'], key: 'Eager to learn' },
    { patterns: ['accountability', 'accountable'], key: 'Accountability' },
    { patterns: ['attention to detail', 'detail-oriented'], key: 'Attention to detail' },
    { patterns: ['team player', 'we are one team'], key: 'Team player' },
    { patterns: ['diverse', 'diversity'], key: 'Diversity' },
    { patterns: ['innovative', 'innovation', 'great ideas'], key: 'Innovation' },
];
function condenseSoftSkill(s) {
    const trimmed = s.trim();
    if (trimmed.length <= MAX_SOFT_SKILL_LENGTH) {
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    const lower = trimmed.toLowerCase();
    for (const { patterns, key } of SOFT_SKILL_CONDENSE) {
        if (patterns.some((p) => lower.includes(p)))
            return key;
    }
    const firstWord = trimmed.split(/\s+/)[0];
    return firstWord ? firstWord.charAt(0).toUpperCase() + firstWord.slice(1) : trimmed;
}
function isTechnicalSkill(skill) {
    const normalized = skill.trim().replace(/\s+/g, ' ');
    if (!normalized || normalized.length > 50 || /[.!?]/.test(normalized))
        return false;
    const lower = normalized.toLowerCase();
    if (JOB_TITLE_EXCLUSIONS.has(lower))
        return false;
    // Exclude soft skills (communication, collaboration, ownership, etc.)
    if (SOFT_SKILL_SIGNALS.some((signal) => lower.includes(signal)))
        return false;
    // Allow: known tech (languages, frameworks, tools) OR any skill that looks technical
    // Previously we only allowed whitelisted items, which dropped things like
    // "Backend development", "Event-driven architectures", "REST APIs"
    const inKnownSets = LANGUAGE_SKILLS.has(lower) ||
        FRAMEWORK_SKILLS.has(lower) ||
        OTHER_TECH_SKILLS.has(lower);
    if (inKnownSets)
        return true;
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
function prioritizeSoftSkills(skills) {
    const prioritized = skills.filter((skill) => SOFT_SKILL_SIGNALS.some((signal) => skill.toLowerCase().includes(signal)));
    const remainder = skills.filter((skill) => !SOFT_SKILL_SIGNALS.some((signal) => skill.toLowerCase().includes(signal)));
    return [...prioritized, ...remainder];
}
function applySkillsLimit(data) {
    const MAX_SOFT_SKILLS = 10;
    const combinedHardRaw = data.hardSkills ?? data.skills ?? [];
    const hardFiltered = normalizeSkills(combinedHardRaw).filter(isTechnicalSkill);
    const hardLimited = hardFiltered.map(capitalizeHardSkill);
    const softRaw = prioritizeSoftSkills(normalizeSkills(data.softSkills));
    const softCondensed = softRaw.slice(0, MAX_SOFT_SKILLS).map(condenseSoftSkill);
    const softSeen = new Set();
    const softLimited = softCondensed.filter((s) => {
        const key = s.toLowerCase();
        if (softSeen.has(key))
            return false;
        softSeen.add(key);
        return true;
    });
    return {
        ...data,
        hardSkills: hardLimited,
        softSkills: softLimited,
        skills: hardLimited,
    };
}
async function ensureGeneratedDir() {
    try {
        await promises_1.default.access(GENERATED_DIR);
    }
    catch {
        await promises_1.default.mkdir(GENERATED_DIR, { recursive: true });
    }
}
function sanitizeFilename(str) {
    return str
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}
async function enforceSinglePageFit(page) {
    await page.evaluate(() => {
        const doc = globalThis.document;
        const body = doc?.body;
        if (!body)
            return;
        body.style.zoom = '1';
        body.style.transform = '';
        body.style.transformOrigin = '';
        body.style.width = '';
    });
    const layout = await page.evaluate(() => {
        const doc = globalThis.document;
        const html = doc?.documentElement;
        const body = doc?.body;
        return {
            width: Math.max(html?.scrollWidth ?? 0, html?.clientWidth ?? 0, body?.scrollWidth ?? 0, body?.clientWidth ?? 0),
            height: Math.max(html?.scrollHeight ?? 0, html?.clientHeight ?? 0, body?.scrollHeight ?? 0, body?.clientHeight ?? 0),
        };
    });
    if (!layout.width || !layout.height)
        return;
    // Do NOT apply zoom. Template font sizes must render 1:1 in the PDF.
    // Previously we scaled down when overflowing (and up when underflowing),
    // which neutralized font-size changes. Now we render at actual size;
    // content may spill to page 2 if fonts are large or content is long.
}
async function countEstimatedPages(page) {
    const scaledHeight = await page.evaluate(() => {
        const doc = globalThis.document;
        const body = doc?.body;
        const html = doc?.documentElement;
        const bodyRectHeight = body?.getBoundingClientRect?.().height ?? 0;
        const htmlRectHeight = html?.getBoundingClientRect?.().height ?? 0;
        return Math.max(bodyRectHeight, htmlRectHeight);
    });
    if (!scaledHeight)
        return 1;
    return Math.max(1, Math.ceil(scaledHeight / A4_PRINTABLE_HEIGHT_PX));
}
function countPdfPages(pdfBuffer) {
    const content = pdfBuffer.toString('latin1');
    const matches = content.match(/\/Type\s*\/Page\b/g);
    return matches?.length ?? 1;
}
function getResumeTitle(profile) {
    const profileTitle = profile.title?.trim();
    if (profileTitle)
        return profileTitle;
    const lastRole = profile.experience?.[0]?.title?.trim();
    return lastRole || 'Professional';
}
/** Sanitize title for ATS: remove hyphens, periods, commas, and other symbols */
function sanitizeTitleForATS(title) {
    return title
        .replace(/[-.,;:'"()\[\]\/\\@#$%&*+=<>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function prepareResumeRenderData(profile, tailoredContent, companyName, role) {
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
async function generateResumePDF(profile, template, tailoredContent, pathInfo, companyName, role) {
    await ensureGeneratedDir();
    const renderData = prepareResumeRenderData(profile, tailoredContent, companyName, role);
    // Compile and render template
    const compiledTemplate = handlebars_1.default.compile(template.htmlContent);
    const html = compiledTemplate(renderData);
    // Add CSS if separate
    const fullHtml = template.cssContent
        ? `<style>${template.cssContent}</style>${html}`
        : html;
    // Generate PDF with Puppeteer
    const browser = await puppeteer_1.default.launch({
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
        const filepath = path_1.default.join(pathInfo.absoluteDir, pdfFilename);
        let finalPdf = null;
        for (let attempt = 1; attempt <= SINGLE_PAGE_MAX_ATTEMPTS; attempt++) {
            await enforceSinglePageFit(page);
            // If still close to overflow, apply a tiny additional shrink on retry attempts.
            if (attempt > 1) {
                const nudgeScale = Math.max(0.92, 1 - attempt * 0.02);
                await page.evaluate((scale) => {
                    const doc = globalThis.document;
                    const body = doc?.body;
                    if (!body)
                        return;
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
            console.warn(`PDF exceeds one page (attempt ${attempt}/${SINGLE_PAGE_MAX_ATTEMPTS}, estimated=${estimatedPages}, actual=${actualPages}); regenerating.`);
        }
        if (!finalPdf) {
            throw new Error('Failed to generate PDF');
        }
        await promises_1.default.mkdir(path_1.default.dirname(filepath), { recursive: true });
        await promises_1.default.writeFile(filepath, finalPdf);
        return relativePath;
    }
    finally {
        await browser.close();
    }
}
async function generatePreviewHTML(profile, template, tailoredContent) {
    const renderData = prepareResumeRenderData(profile, tailoredContent);
    // Compile and render template
    const compiledTemplate = handlebars_1.default.compile(template.htmlContent);
    const html = compiledTemplate(renderData);
    // Add CSS if separate
    return template.cssContent
        ? `<style>${template.cssContent}</style>${html}`
        : html;
}
/** Sample profile for template preview */
const SAMPLE_PROFILE = {
    id: 'preview',
    name: 'Jane Smith',
    title: 'Senior Software Engineer',
    totalYearsExperience: 5,
    contact: {
        phone: '+1 (555) 123-4567',
        email: 'jane.smith@email.com',
        linkedin: 'linkedin.com/in/janesmith',
        location: 'San Francisco, CA',
    },
    summary: 'Experienced software engineer with 5+ years building scalable web applications. Strong focus on clean code and team collaboration.',
    experience: [
        {
            title: 'Senior Software Engineer',
            company: 'Tech Corp',
            startDate: '01/2021',
            endDate: 'Present',
            location: 'San Francisco, CA',
            description: 'Lead development of customer-facing platforms.',
            achievements: ['Reduced load time by 40%', 'Mentored 3 junior engineers'],
        },
        {
            title: 'Software Engineer',
            company: 'Startup Inc',
            startDate: '06/2019',
            endDate: '12/2020',
            location: 'Remote',
            description: 'Full-stack development for SaaS product.',
            achievements: ['Built REST APIs', 'Implemented CI/CD pipeline'],
        },
    ],
    strengths: [
        { title: 'Problem Solving', description: 'Analytical approach to complex challenges.' },
        { title: 'Communication', description: 'Clear technical documentation and presentations.' },
    ],
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
    education: [
        {
            degree: 'B.S. Computer Science',
            institution: 'State University',
            startDate: '2015',
            endDate: '2019',
            location: 'Boston, MA',
        },
    ],
    createdAt: '',
    updatedAt: '',
};
function generateTemplatePreviewHTML(template) {
    const renderData = prepareResumeRenderData(SAMPLE_PROFILE);
    const compiledTemplate = handlebars_1.default.compile(template.htmlContent);
    const html = compiledTemplate(renderData);
    const fullHtml = template.cssContent
        ? `<style>${template.cssContent}</style>${html}`
        : html;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:8px;background:#f3f4f6;">${fullHtml}</body></html>`;
}
async function getGeneratedPDFPath(filename) {
    const filepath = path_1.default.join(GENERATED_DIR, filename);
    try {
        await promises_1.default.access(filepath);
        return filepath;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=pdfGenerator.js.map