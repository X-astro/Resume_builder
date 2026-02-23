"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROVIDER = void 0;
exports.resolveAIProvider = resolveAIProvider;
exports.analyzeJobDescription = analyzeJobDescription;
exports.tailorResume = tailorResume;
exports.generateCoverLetter = generateCoverLetter;
exports.extractTemplateFromPDF = extractTemplateFromPDF;
exports.extractProfileFromResume = extractProfileFromResume;
const openai_1 = __importDefault(require("openai"));
// Lazy initialization to ensure env vars are loaded first
let openaiClient = null;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_PROVIDER = 'openai';
exports.DEFAULT_PROVIDER = DEFAULT_PROVIDER;
const ANTHROPIC_MAX_RETRIES = 4;
const ANTHROPIC_BASE_RETRY_DELAY_MS = 600;
const MIN_ROLE_BRIEF_LENGTH = 200;
const MAX_ROLE_BRIEF_LENGTH = 450;
const SOFT_SKILL_SIGNALS = [
    'accountability',
    'communication',
    'collaboration',
    'mindset',
    'mentality',
    'ownership',
    'reliability',
    'resilient',
    'supportive',
    'eager to learn',
    'adaptability',
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
const ATS_SOFT_SKILL_RULES = [
    { canonical: 'Reliability', patterns: ['reliability', 'reliable'] },
    { canonical: 'Resilient', patterns: ['resilient', 'resilience'] },
    { canonical: 'Supportive', patterns: ['supportive', 'support'] },
    { canonical: 'Communication', patterns: ['communication', 'communicate'] },
    { canonical: 'Collaboration skills', patterns: ['collaboration', 'collaborative'] },
    { canonical: 'Cross-functional team', patterns: ['cross-functional', 'cross functional'] },
    { canonical: 'Strong problem-solving skills', patterns: ['problem-solving', 'problem solving'] },
    { canonical: 'Eager to learn', patterns: ['eager to learn', 'lifelong learning'] },
    { canonical: 'Accountability', patterns: ['accountability', 'accountable'] },
];
const HARD_SKILL_PRIORITY_SIGNALS = [
    'ai',
    'ruby',
    'sre',
    'cloud infrastructure',
    'cloud technologies',
    'automation',
    'aws',
    'kubernetes',
    'docker',
    'linux',
    'infrastructure as code',
    'iac',
    'devops',
    'ci/cd',
    'terraform',
    'monitoring',
    'observability',
    'bash scripting',
    'troubleshoot',
    'log analysis',
    'server-side',
    'abstraction',
    'debugging',
    'aws cloud',
    'tooling',
    'version control',
];
const HARD_SKILL_RULES = [
    { canonical: 'Bash scripting', patterns: ['bash scripting', 'bash'] },
    { canonical: 'Troubleshoot', patterns: ['troubleshoot', 'troubleshooting'] },
    { canonical: 'Log analysis', patterns: ['log analysis', 'logging'] },
    { canonical: 'Server-side', patterns: ['server-side', 'server side'] },
    { canonical: 'Abstraction', patterns: ['abstraction'] },
    { canonical: 'Debugging', patterns: ['debugging', 'debug'] },
    { canonical: 'AWS cloud', patterns: ['aws cloud', 'aws'] },
    { canonical: 'Tooling', patterns: ['tooling', 'tools'] },
    { canonical: 'Version control', patterns: ['version control', 'git'] },
];
const HARD_SKILL_DEFINITIONS = [
    { display: 'Python', category: 'language', aliases: ['python'] },
    { display: 'JavaScript', category: 'language', aliases: ['javascript', 'js'] },
    { display: 'TypeScript', category: 'language', aliases: ['typescript', 'ts'] },
    { display: 'Java', category: 'language', aliases: ['java'] },
    { display: 'Go', category: 'language', aliases: ['go', 'golang'] },
    { display: 'Rust', category: 'language', aliases: ['rust'] },
    { display: 'Ruby', category: 'language', aliases: ['ruby'] },
    { display: 'PHP', category: 'language', aliases: ['php'] },
    { display: 'C++', category: 'language', aliases: ['c++'] },
    { display: 'C#', category: 'language', aliases: ['c#'] },
    { display: 'Kotlin', category: 'language', aliases: ['kotlin'] },
    { display: 'Swift', category: 'language', aliases: ['swift'] },
    { display: 'Scala', category: 'language', aliases: ['scala'] },
    { display: 'SQL', category: 'language', aliases: ['sql'] },
    { display: 'HTML', category: 'language', aliases: ['html'] },
    { display: 'CSS', category: 'language', aliases: ['css'] },
    { display: 'Elixir', category: 'language', aliases: ['elixir'] },
    { display: 'Bash', category: 'language', aliases: ['bash', 'bash scripting'] },
    { display: 'React', category: 'framework', aliases: ['react', 'react.js', 'reactjs'] },
    { display: 'Next.js', category: 'framework', aliases: ['next', 'next.js', 'nextjs'] },
    { display: 'Node.js', category: 'framework', aliases: ['node', 'node.js', 'nodejs'] },
    { display: 'Vue', category: 'framework', aliases: ['vue', 'vue.js', 'vuejs'] },
    { display: 'Express', category: 'framework', aliases: ['express', 'express.js', 'expressjs'] },
    { display: 'Angular', category: 'framework', aliases: ['angular', 'angular.js', 'angularjs'] },
    { display: 'NestJS', category: 'framework', aliases: ['nest', 'nestjs', 'nest.js'] },
    { display: 'Nuxt', category: 'framework', aliases: ['nuxt', 'nuxt.js', 'nuxtjs'] },
    { display: 'Django', category: 'framework', aliases: ['django'] },
    { display: 'Flask', category: 'framework', aliases: ['flask'] },
    { display: 'FastAPI', category: 'framework', aliases: ['fastapi', 'fast api'] },
    { display: 'Fastify', category: 'framework', aliases: ['fastify'] },
    { display: 'Laravel', category: 'framework', aliases: ['laravel'] },
    { display: 'Ruby on Rails', category: 'framework', aliases: ['rails', 'ruby on rails'] },
    { display: 'Spring', category: 'framework', aliases: ['spring', 'spring boot', 'springboot'] },
    { display: 'TensorFlow', category: 'framework', aliases: ['tensorflow', 'tensor flow'] },
    { display: 'PyTorch', category: 'framework', aliases: ['pytorch', 'py torch', 'torch'] },
    { display: 'Keras', category: 'framework', aliases: ['keras'] },
    { display: 'Scikit-learn', category: 'framework', aliases: ['scikit-learn', 'sklearn'] },
    { display: 'Pandas', category: 'framework', aliases: ['pandas'] },
    { display: 'NumPy', category: 'framework', aliases: ['numpy', 'num py'] },
    { display: 'Redux', category: 'framework', aliases: ['redux'] },
    { display: 'React Router', category: 'framework', aliases: ['react router'] },
    { display: 'TailwindCSS', category: 'framework', aliases: ['tailwind', 'tailwindcss', 'tailwind css'] },
    { display: 'MUI', category: 'framework', aliases: ['mui', 'material ui', 'material-ui'] },
    { display: 'Sass', category: 'framework', aliases: ['sass'] },
    { display: 'SCSS', category: 'framework', aliases: ['scss'] },
    { display: 'Svelte', category: 'framework', aliases: ['svelte', 'svelte.js', 'sveltejs'] },
    { display: 'Ember', category: 'framework', aliases: ['ember', 'ember.js', 'emberjs'] },
    { display: 'jQuery', category: 'framework', aliases: ['jquery', 'jquery.js', 'jqueryjs'] },
    { display: 'Bootstrap', category: 'framework', aliases: ['bootstrap'] },
    { display: 'GraphQL', category: 'framework', aliases: ['graphql'] },
    { display: 'SWR', category: 'framework', aliases: ['swr'] },
    { display: 'Flutter', category: 'framework', aliases: ['flutter'] },
    { display: 'React Native', category: 'framework', aliases: ['react native', 'reactnative'] },
    { display: '.NET', category: 'framework', aliases: ['.net', 'dotnet', 'asp.net', 'aspnet'] },
    { display: 'Docker', category: 'other', aliases: ['docker'] },
    { display: 'Kubernetes', category: 'other', aliases: ['kubernetes', 'k8s', 'kube'] },
    { display: 'AWS', category: 'other', aliases: ['aws', 'aws cloud'] },
    { display: 'GCP', category: 'other', aliases: ['gcp', 'google cloud'] },
    { display: 'Azure', category: 'other', aliases: ['azure'] },
    { display: 'Git', category: 'other', aliases: ['git', 'version control'] },
    { display: 'Nginx', category: 'other', aliases: ['nginx'] },
    { display: 'Redis', category: 'other', aliases: ['redis'] },
    { display: 'Celery', category: 'other', aliases: ['celery'] },
    { display: 'PostgreSQL', category: 'other', aliases: ['postgres', 'postgresql', 'psql'] },
    { display: 'MongoDB', category: 'other', aliases: ['mongodb', 'mongo'] },
    { display: 'MySQL', category: 'other', aliases: ['mysql'] },
    { display: 'NoSQL', category: 'other', aliases: ['nosql'] },
    { display: 'OpenAPI', category: 'other', aliases: ['openapi'] },
    { display: 'RESTful API', category: 'other', aliases: ['restful api', 'rest api', 'rest'] },
    { display: 'JWT', category: 'other', aliases: ['jwt'] },
    { display: 'OAuth', category: 'other', aliases: ['oauth'] },
    { display: 'Jest', category: 'other', aliases: ['jest'] },
    { display: 'Mocha', category: 'other', aliases: ['mocha'] },
    { display: 'Chai', category: 'other', aliases: ['chai'] },
    { display: 'CI/CD', category: 'other', aliases: ['ci/cd', 'github actions', 'gitlab ci'] },
    { display: 'Vercel', category: 'other', aliases: ['vercel'] },
    { display: 'Netlify', category: 'other', aliases: ['netlify'] },
    { display: 'Figma', category: 'other', aliases: ['figma'] },
    { display: 'Sketch', category: 'other', aliases: ['sketch'] },
    { display: 'Unix/Linux', category: 'other', aliases: ['unix/linux', 'linux'] },
    { display: 'RDBMS', category: 'other', aliases: ['rdbms/sql', 'rdbms'] },
    { display: 'Webpack', category: 'other', aliases: ['webpack'] },
    { display: 'Vite', category: 'other', aliases: ['vite'] },
    { display: 'Gatsby', category: 'other', aliases: ['gatsby'] },
    { display: 'ESLint', category: 'other', aliases: ['eslint', 'es lint'] },
    { display: 'OpenAI API', category: 'other', aliases: ['openai api'] },
    { display: 'LLM', category: 'other', aliases: ['llm', 'llms'] },
    { display: 'Terraform', category: 'other', aliases: ['terraform'] },
    { display: 'Ansible', category: 'other', aliases: ['ansible'] },
    { display: 'Jenkins', category: 'other', aliases: ['jenkins'] },
    { display: 'Kafka', category: 'other', aliases: ['kafka'] },
    { display: 'RabbitMQ', category: 'other', aliases: ['rabbitmq'] },
    { display: 'Airflow', category: 'other', aliases: ['airflow'] },
    { display: 'dbt', category: 'other', aliases: ['dbt'] },
    { display: 'Snowflake', category: 'other', aliases: ['snowflake'] },
    { display: 'DynamoDB', category: 'other', aliases: ['dynamodb'] },
    { display: 'Cloudflare Workers', category: 'other', aliases: ['cloudflare workers', 'cloudflare'] },
    { display: 'AWS Lambda', category: 'other', aliases: ['aws lambda', 'lambda'] },
];
const HARD_SKILL_ALIAS_MAP = new Map();
for (const definition of HARD_SKILL_DEFINITIONS) {
    for (const alias of definition.aliases) {
        HARD_SKILL_ALIAS_MAP.set(alias, { display: definition.display, category: definition.category });
    }
}
function resolveAIProvider(model) {
    if (model === 'openai' || model?.startsWith('gpt-')) {
        return 'openai';
    }
    if (model === 'claude' || model?.startsWith('claude-')) {
        return 'claude';
    }
    return DEFAULT_PROVIDER;
}
function getOpenAIClient() {
    if (!openaiClient) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        openaiClient = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openaiClient;
}
async function createAnthropicMessage(prompt, maxTokens, temperature = 0) {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const getRetryDelayMs = (attempt, retryAfterHeader) => {
        // Honor provider hint when present, otherwise use capped exponential backoff with jitter.
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
            return Math.min(Math.round(retryAfterSeconds * 1000), 15000);
        }
        const exponential = ANTHROPIC_BASE_RETRY_DELAY_MS * (2 ** (attempt - 1));
        const jitter = Math.round(Math.random() * 300);
        return Math.min(exponential + jitter, 15000);
    };
    const isRetriableStatus = (status) => status === 429 || status === 529 || (status >= 500 && status < 600);
    let lastError = null;
    for (let attempt = 1; attempt <= ANTHROPIC_MAX_RETRIES; attempt++) {
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: CLAUDE_MODEL,
                    max_tokens: maxTokens,
                    temperature,
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                const error = new Error(`Anthropic API error (${response.status}): ${errorText}`);
                if (!isRetriableStatus(response.status) || attempt === ANTHROPIC_MAX_RETRIES) {
                    throw error;
                }
                const delayMs = getRetryDelayMs(attempt, response.headers.get('retry-after'));
                console.warn(`Anthropic returned ${response.status} (attempt ${attempt}/${ANTHROPIC_MAX_RETRIES}); retrying in ${delayMs}ms.`);
                await sleep(delayMs);
                continue;
            }
            const data = await response.json();
            const textBlock = data.content?.find((block) => block.type === 'text' && typeof block.text === 'string');
            if (!textBlock?.text) {
                throw new Error('Unexpected response from Anthropic');
            }
            return textBlock.text;
        }
        catch (error) {
            const maybeError = error instanceof Error ? error : new Error(String(error));
            lastError = maybeError;
            const isLastAttempt = attempt === ANTHROPIC_MAX_RETRIES;
            const isNetworkFailure = maybeError.name === 'TypeError' || maybeError.message.toLowerCase().includes('fetch failed');
            if (!isNetworkFailure || isLastAttempt) {
                throw maybeError;
            }
            const delayMs = getRetryDelayMs(attempt, null);
            console.warn(`Anthropic request failed due to network issue (attempt ${attempt}/${ANTHROPIC_MAX_RETRIES}); retrying in ${delayMs}ms.`);
            await sleep(delayMs);
        }
    }
    throw lastError ?? new Error('Anthropic request failed');
}
async function createTextCompletion(prompt, provider = DEFAULT_PROVIDER, maxTokens = 4000, temperature = 0) {
    if (provider === 'openai') {
        const response = await getOpenAIClient().chat.completions.create({
            model: OPENAI_MODEL,
            max_tokens: maxTokens,
            temperature,
            top_p: 1,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are a strict JSON generator. Return valid JSON only, with no markdown fences or extra text.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Unexpected response from OpenAI');
        }
        return content;
    }
    return createAnthropicMessage(prompt, maxTokens, temperature);
}
// Helper function to extract JSON from model response
// Some models wrap JSON in markdown code blocks
function extractJSON(text) {
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
        return jsonBlockMatch[1].trim();
    }
    return text.trim();
}
function normalizeSkillsList(skills) {
    if (!Array.isArray(skills))
        return [];
    const seen = new Set();
    const normalized = [];
    for (const raw of skills) {
        if (typeof raw !== 'string')
            continue;
        const skill = raw.trim();
        if (!skill)
            continue;
        const key = skill.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        normalized.push(skill);
    }
    return normalized;
}
function normalizeHardSkillAlias(skill) {
    return skill.trim().toLowerCase().replace(/\s+/g, ' ');
}
function resolveHardSkill(skill) {
    const normalized = skill.trim().replace(/\s+/g, ' ');
    if (!normalized || normalized.length > 50 || /[.!?]/.test(normalized))
        return null;
    const lower = normalizeHardSkillAlias(normalized);
    // Exclude soft skills only (communication, collaboration, ownership, etc.)
    if (SOFT_SKILL_SIGNALS.some((signal) => lower.includes(signal)))
        return null;
    // If in alias map, return canonical form
    const mapped = HARD_SKILL_ALIAS_MAP.get(lower);
    if (mapped)
        return mapped;
    // Pass through as hard skill: frameworks, tools, architectures, methodologies, tech names
    const techIndicators = [
        'api', 'rest', 'graphql', 'backend', 'frontend', 'fullstack', 'full-stack',
        'microservice', 'event-driven', 'distributed', 'database', 'sql', 'etl',
        'devops', 'ci/cd', 'docker', 'kubernetes', 'aws', 'cloud', 'architecture',
        'python', 'javascript', 'typescript', 'react', 'vue', 'angular', 'nuxt', 'svelte', 'ember', 'django', 'node', 'go', 'rust', 'rails', 'spring', 'laravel',
        'redis', 'postgres', 'mysql', 'kafka', 'airflow', 'dbt', 'snowflake',
        'terraform', 'testing', 'celery', 'flutter', 'lambda', 'cloudflare',
    ];
    if (techIndicators.some((term) => lower.includes(term))) {
        return { display: normalized, category: 'other' };
    }
    // Single-word tech (Airflow, dbt, Kafka) - allow if looks like a tool/framework name
    if (/^[a-z0-9][a-z0-9+\-./]*$/.test(lower) && lower.length >= 2) {
        return { display: normalized, category: 'other' };
    }
    return null;
}
function normalizeAllowedHardSkills(skills) {
    const seen = new Set();
    const result = [];
    for (const raw of skills) {
        const resolved = resolveHardSkill(raw);
        if (!resolved)
            continue;
        const key = resolved.display.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(resolved.display);
    }
    return result;
}
function isTechnicalSkill(skill) {
    return resolveHardSkill(skill) !== null;
}
function prioritizeSoftSkills(skills) {
    return [...skills].sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aScore = SOFT_SKILL_SIGNALS.reduce((count, signal) => count + (aLower.includes(signal) ? 1 : 0), 0);
        const bScore = SOFT_SKILL_SIGNALS.reduce((count, signal) => count + (bLower.includes(signal) ? 1 : 0), 0);
        if (bScore !== aScore)
            return bScore - aScore;
        return a.length - b.length;
    });
}
function inferAtsSoftSkillsFromText(text) {
    const lower = text.toLowerCase();
    return ATS_SOFT_SKILL_RULES
        .filter((rule) => rule.patterns.some((pattern) => lower.includes(pattern)))
        .map((rule) => rule.canonical);
}
function inferAtsSoftSkillsFromAnalysis(jobAnalysis) {
    if (!jobAnalysis)
        return [];
    const text = [
        ...(jobAnalysis.softSkills ?? []),
        ...(jobAnalysis.keywords ?? []),
        ...(jobAnalysis.keyResponsibilities ?? []),
        ...(jobAnalysis.industryTerms ?? []),
        jobAnalysis.companyInfo ?? '',
    ].join(' | ');
    return inferAtsSoftSkillsFromText(text);
}
function inferHardSkillsFromText(text) {
    const lower = text.toLowerCase();
    return HARD_SKILL_RULES
        .filter((rule) => rule.patterns.some((pattern) => lower.includes(pattern)))
        .map((rule) => rule.canonical);
}
function prioritizeHardSkills(skills, _jobAnalysis) {
    // Keep normalized insertion order (no sorting).
    return normalizeAllowedHardSkills(skills);
}
function buildFallbackExperienceDescription(title, jobAnalysis) {
    const role = title.trim() || 'Engineer';
    const responsibility = jobAnalysis?.keyResponsibilities?.find((item) => item.trim()) ||
        'delivering reliable solutions aligned with business goals';
    const keywords = (jobAnalysis?.keywords ?? []).slice(0, 2).join(', ');
    const suffix = keywords ? ` with focus on ${keywords}` : '';
    const text = `${role} focused on ${responsibility}${suffix}.`;
    return text.slice(0, MAX_ROLE_BRIEF_LENGTH).trim();
}
function buildFallbackAchievements(jobAnalysis) {
    const base = (jobAnalysis?.keyResponsibilities ?? [])
        .filter((item) => item.trim())
        .slice(0, 3);
    if (base.length > 0) {
        return base.map((item) => item.replace(/\.$/, '').trim());
    }
    return [
        'Improved delivery consistency across critical projects.',
        'Enhanced service reliability and operational efficiency.',
    ];
}
function ensureMinLength(text, minLength, fillerParts) {
    let result = text.trim();
    for (const part of fillerParts) {
        if (result.length >= minLength)
            break;
        const clean = part.trim().replace(/\s+/g, ' ');
        if (!clean)
            continue;
        result = result ? `${result} ${clean}` : clean;
    }
    return result;
}
function ensureSummaryUsesExperienceYears(summary, profile) {
    const years = profile.totalYearsExperience;
    if (typeof years !== 'number' || !Number.isFinite(years) || years < 0) {
        return summary.trim();
    }
    const normalizedSummary = summary.trim().replace(/\s+/g, ' ');
    const yearsText = Number.isInteger(years) ? String(years) : years.toFixed(1);
    const prefixRole = profile.title?.trim() || 'Professional';
    const topSkills = (profile.skills ?? []).slice(0, 3);
    const skillsText = topSkills.length > 0 ? ` in ${topSkills.join(', ')}` : '';
    const leadSentence = `${prefixRole} with about ${yearsText} years of experience${skillsText}.`;
    // Keep the remaining summary content, but avoid duplicate years-style lead sentences.
    const remainder = normalizedSummary
        .replace(/^[^.]*\b\d+(?:\.\d+)?\s*\+?\s*years?\b[^.]*\.?\s*/i, '')
        .trim();
    return remainder ? `${leadSentence} ${remainder}` : leadSentence;
}
function limitSummaryNumericMentions(summary, maxMentions = 1) {
    const text = summary.trim().replace(/\s+/g, ' ');
    if (!text)
        return text;
    const numberPattern = /\b\d+(?:\.\d+)?\+?\b/g;
    let seen = 0;
    return text.replace(numberPattern, (match) => {
        seen += 1;
        return seen <= maxMentions ? match : '';
    }).replace(/\s+/g, ' ').replace(/\s([.,;:!?])/g, '$1').trim();
}
function toTitleCase(text) {
    return text
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}
function buildSimpleSeniorEngineerTitle(contentTitle, jobAnalysis, profile) {
    const source = (jobAnalysis?.jobTitle || contentTitle || profile?.title || '').trim();
    const cleaned = source
        .replace(/[^a-zA-Z0-9\s/+.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const stopWords = new Set([
        'a',
        'an',
        'and',
        'for',
        'of',
        'the',
        'to',
        'with',
        'at',
        'in',
        'on',
    ]);
    const roleWords = new Set([
        'engineer',
        'engineering',
        'developer',
        'development',
        'architect',
        'specialist',
        'manager',
        'lead',
        'principal',
        'staff',
        'sr',
        'senior',
        'mid',
        'junior',
        'ii',
        'iii',
        'iv',
    ]);
    const domainTokens = cleaned
        .split(/\s+/)
        .map((token) => token.toLowerCase())
        .filter((token) => token && !stopWords.has(token) && !roleWords.has(token))
        .slice(0, 2);
    const domain = domainTokens.length > 0 ? toTitleCase(domainTokens.join(' ')) : 'Software';
    return `Senior ${domain} Engineer`;
}
function normalizeTailoredContent(content, jobAnalysis, profile) {
    const MAX_SOFT_SKILLS = 10;
    // Job analysis skills FIRST (required, preferred, keywords) - must appear in hard skills
    const jobHardRaw = [
        ...(jobAnalysis?.requiredSkills ?? []),
        ...(jobAnalysis?.preferredSkills ?? []),
        ...(jobAnalysis?.keywords ?? []),
        ...(jobAnalysis?.industryTerms ?? []),
    ];
    const combinedHardRaw = [
        ...jobHardRaw,
        ...(content.requiredSkills ?? []),
        ...(content.preferredSkills ?? []),
        ...(content.hardSkills ?? content.skills ?? []),
        ...(profile?.skills ?? []),
    ];
    const atsSoftPriority = inferAtsSoftSkillsFromAnalysis(jobAnalysis);
    const hardSkills = prioritizeHardSkills(normalizeAllowedHardSkills(combinedHardRaw), jobAnalysis);
    const softFromModel = normalizeSkillsList(content.softSkills);
    const softFromAnalysis = normalizeSkillsList(jobAnalysis?.softSkills);
    const softMerged = normalizeSkillsList([...atsSoftPriority, ...softFromModel, ...softFromAnalysis]);
    const softSkills = prioritizeSoftSkills(softMerged);
    const hardLimited = hardSkills; // No limit on hard skills
    const softSlots = MAX_SOFT_SKILLS;
    const softLimited = softSkills.slice(0, softSlots);
    const trimIncompleteEnd = (s) => s.trim().replace(/,+\s*$/, '').replace(/\s+(and|or)\s*$/i, '').trim();
    const clampRoleBrief = (description) => {
        const cleanBase = description.trim().replace(/\s+/g, ' ');
        const clean = ensureMinLength(cleanBase, MIN_ROLE_BRIEF_LENGTH, [
            ...(jobAnalysis?.keyResponsibilities ?? []).slice(0, 3),
            ...(jobAnalysis?.keywords ?? []).slice(0, 2).map((k) => `Focus on ${k}.`),
        ]);
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
    };
    const normalizeSummary = (summary) => summary.trim().replace(/\s+/g, ' ');
    const normalizedExperience = (content.experience ?? []).map((item) => ({
        ...item,
        description: clampRoleBrief(item.description ?? buildFallbackExperienceDescription(item.title ?? '', jobAnalysis)),
        achievements: normalizeSkillsList(item.achievements).length > 0
            ? normalizeSkillsList(item.achievements)
            : buildFallbackAchievements(jobAnalysis),
    }));
    return {
        ...content,
        title: buildSimpleSeniorEngineerTitle(content.title, jobAnalysis, profile),
        summary: limitSummaryNumericMentions(normalizeSummary(profile ? ensureSummaryUsesExperienceYears(content.summary ?? '', profile) : (content.summary ?? '').trim()), 1),
        experience: normalizedExperience,
        hardSkills: hardLimited,
        softSkills: softLimited,
        // Keep legacy field aligned with hard skills for older templates/components.
        skills: hardLimited,
    };
}
async function analyzeJobDescription(jobDescription, provider = DEFAULT_PROVIDER) {
    const content = await createTextCompletion(`Analyze the following job description and extract key information for ATS optimization.

IMPORTANT: For softSkills, extract EVERY phrase related to personal qualities, work style, or interpersonal abilities. Use the EXACT wording from the job description.

Return a JSON object with EXACTLY these fields:
- requiredSkills: array of ALL required technical skills. CRITICAL: Include EVERY framework and library mentioned (e.g., "React", "Flutter", "React Native", "Django", "Node.js", ".NET", "Next.js", "Express"). Also languages ("Python", "JavaScript", "TypeScript") and tools ("AWS", "Docker", "Git")
- preferredSkills: array of preferred/nice-to-have technical skills (frameworks, libraries, tools)
- keywords: array of important keywords and phrases for ATS
- experienceLevel: string describing experience level (e.g., "Senior", "Mid-level", "Entry-level")
- keyResponsibilities: array of main job responsibilities
- industryTerms: array of industry-specific terms and acronyms
- softSkills: array of ALL soft skills, qualities, and work-style phrases mentioned. CRITICAL:
  * Include both phrase-style and single-word traits when present
  * Capture ATS-highlighted traits like "Accountability", "Collaboration skills", "Communication", "Cross-functional team", "Eager to learn", "Reliability", "Resilient", "Strong problem-solving skills", "Supportive"
  * Extract EXACT phrases like "high ownership mentality", "product-minded", "driving clarity"
  * Include phrases about autonomy: "high autonomy", "self-directed", "independent"
  * Include collaboration phrases: "collaboration mindset", "helping teams adapt", "cross-functional", "diverse backgrounds"
  * Include communication: "excellent communication skills", "transparency", "fluency in English"
  * Include mindset phrases: "lifelong learning", "passion", "laser-focused", "comfortable navigating ambiguity"
  * Include quality phrases: "technical excellence", "product awareness", "attention to detail"
  * Include role phrases: "key role", "understands trade-offs", "user needs", "impact-driven"
  * Include bonus phrases: "strong plus", "nice to have", "bonus points"
  * Include ANY phrase describing desired personality, work style, or interpersonal skills
  * Look for phrases in "About you", "Requirements", "Nice to have", and company culture sections
  * Aim for 20-30 soft skill phrases - extract EVERYTHING including "strong plus" type phrases
- certifications: array of any certifications mentioned
- jobTitle: the job title being advertised
- companyInfo: brief info about the company if mentioned

Job Description:
${jobDescription}

Return ONLY valid JSON, no other text.`, provider, 2000);
    try {
        const jsonText = extractJSON(content);
        const parsed = JSON.parse(jsonText);
        const inferredSoft = inferAtsSoftSkillsFromText(jobDescription);
        const inferredHard = inferHardSkillsFromText(jobDescription);
        return {
            ...parsed,
            requiredSkills: normalizeSkillsList([...(parsed.requiredSkills ?? []), ...inferredHard]),
            keywords: normalizeSkillsList([...(parsed.keywords ?? []), ...inferredHard]),
            softSkills: prioritizeSoftSkills(normalizeSkillsList([...(parsed.softSkills ?? []), ...inferredSoft])),
        };
    }
    catch {
        console.error('Failed to parse model response:', content);
        throw new Error('Failed to parse job analysis response');
    }
}
async function tailorResume(profile, jobAnalysis, provider = DEFAULT_PROVIDER) {
    const content = await createTextCompletion(`You are an expert resume writer focused on ATS optimization. Given a candidate's profile and job analysis, create tailored resume content that MAXIMIZES ATS score.

PROFILE:
${JSON.stringify(profile, null, 2)}

JOB ANALYSIS:
${JSON.stringify(jobAnalysis, null, 2)}

CRITICAL ATS OPTIMIZATION INSTRUCTIONS:

1. TITLE: Create a title that matches the job title and includes top keywords
   - Example: If job is "Senior Fullstack Engineer", use similar phrasing

2. SUMMARY: Write a professional summary using this format and style:
   - "Give me a professional summary of software engineer with {total years of exp} years experience. Main skills are {extracted skills from job description}"
   - If PROFILE.totalYearsExperience is provided, use that exact value for years of experience.
   - "Main skills" MUST include: (a) languages, (b) FRAMEWORKS (e.g., React, Django, Flutter, Next.js, Express, Node.js), (c) libraries, (d) tools/platforms from job analysis and profile.
   - Explicitly name at least 2-3 frameworks in the summary (e.g., "React and Django", "Flutter and React Native", "Next.js and Node.js").
   - Pull from jobAnalysis.requiredSkills, jobAnalysis.preferredSkills, profile.skills, and job keywords.
   - Keep the tone senior, concise, and ATS-friendly.
   - Do not overuse numbers in the summary. Prefer no numbers; if needed, mention a number only once.
   - Mention specialization, core technologies (including frameworks), engineering strengths, and impact.
   - Example style:
     "Senior Front-End Engineer specializing in React and Next.js for scalable web application development.
      8+ years of experience building high-performance, user-centric applications using React, Next.js, and modern JavaScript/TypeScript frameworks. Skilled in building responsive user interfaces, optimizing front-end performance, and implementing server-side rendering (SSR) and static site generation (SSG). Strong focus on component-based architecture, clean code practices, and performance optimization. Experienced in integrating AI solutions to enhance user personalization, real-time data processing, and predictive features. Open to senior front-end roles, product-focused teams, and opportunities to drive innovation in UI/UX and AI-powered applications."

3. EXPERIENCE: For each entry, heavily optimize for ATS and MATCH JOB REQUIREMENTS:
   - Role brief ("description") MUST be between 200 and 450 characters
   - Keep role brief concise and impact-focused
   - ALWAYS end with a complete sentence (use period). NEVER end with a trailing comma or incomplete list like "platforms like Cloudflare," - instead write "platforms like Cloudflare, AWS, and Akamai."
   - If a profile experience item has empty description/achievements, generate them from role/title + job requirements
   - For missing achievements, create 2-3 concise bullet points aligned to job responsibilities
   - Rewrite descriptions to USE EXACT PHRASES from job requirements
   - For "Design, build and maintain robust backend services and APIs" -> Use this EXACT phrase
   - For "Build, contribute to and maintain frontend web application using Typescript/React" -> Match this
   - For "end-to-end ownership of projects, from problem discovery to deployment, monitoring, and iteration" -> Include this phrase
   - For "Collaborate across disciplines (Product, Data, Design, Frontend)" -> Mention cross-functional collaboration
   - For "Ensure data quality, observability and performance" -> Include these exact terms
   - For "architecture reviews, technical discussions and mentoring" -> Mention these activities
   - For "continuous improvement in design, test, deploy and monitor" -> Include CI/CD and monitoring
   - Keep all metrics and quantifiable results
   - Weave in soft skill keywords naturally

4. HARD SKILLS (Technical Skills): Build a focused technical skills list. CRITICAL for ATS:
   - MUST include EVERY framework and library from the job description (e.g., React, Flutter, React Native, Django, Node.js, .NET, Next.js, Express) - check requiredSkills, preferredSkills, industryTerms, keywords
   - MUST include every technical item from jobAnalysis.requiredSkills and jobAnalysis.preferredSkills
   - Include concrete programming languages, frameworks/libraries, and tools/platforms.
   - Examples: "Python", "TypeScript", "React", "React Native", "Flutter", "Django", "Node.js", "Next.js", "Docker", "AWS", "PostgreSQL", "Git"
   - NEVER include soft skills, behavior/personality phrases, responsibilities, role descriptions, or broad domains.
   - Exclude generic phrases like "Machine Learning", "Deep Learning", "Data Engineering", "Architecture", "Integration", "Data Structure"
   - Keep each hard skill as a concise noun phrase (1-4 words), not a sentence
   - MUST include ALL technical skills from the profile that match job requirements
   - Do NOT sort hard skills; keep the natural extraction order
  - Include all relevant hard skills (no limit - prioritize job matches, then profile)
   - Use exact standard skill names where possible (e.g., "React", "Node.js", "RESTful API")

5. SOFT SKILLS: Include the most relevant soft skills from the job:
   - Target 8-10 soft skills
   - PRIORITIZE exact ATS-style soft skills commonly screened by tools: "Accountability", "Collaboration skills", "Communication", "Cross-functional team", "Eager to learn", "Reliability", "Resilient", "Strong problem-solving skills", "Supportive"
   - Select only the most ATS-relevant soft skills from jobAnalysis.softSkills
   - Use the EXACT phrases from the job (e.g., "high ownership mentality" not just "ownership")
   - Include ALL of these if they appear in job analysis: "product awareness", "driving clarity", "product-minded", "high autonomy", "technical excellence", "comfortable navigating ambiguity", "helping teams adapt", "transparency", "passion", "laser-focused", "lifelong learning", "collaboration mindset", "excellent communication skills", "key role", "understands trade-offs", "user needs", "fluency in English", "diverse backgrounds", "impact-driven development", "respect", "strong plus"
   - ADD any soft skills mentioned anywhere in the job analysis
  - Include between 8 and 10 soft skills when available
   - Keep only the strongest ATS-relevant soft skill phrases

6. STRENGTHS: Tailor to match the job's key requirements
   - Use keywords from the job analysis
   - Focus on qualities mentioned in the job description

7. COVER LETTER (coverLetter): Write a professional cover letter body (2–4 short paragraphs).
   - Express genuine interest in the role and company
   - Connect your experience and skills to the job requirements
   - Mention 1–2 specific relevant achievements
   - Keep tone professional, concise, and confident
   - Do NOT include salutation ("Dear Hiring Manager") or sign-off ("Best regards")—only the body text

RULES:
- Do NOT invent work experience or companies
- Use EXACT keyword phrases from the job description
- Maximize keyword density while maintaining readability
 - hardSkills: no limit. softSkills: 8-10.
- Keep hardSkills and softSkills clearly separated. Do not mix categories.

Return a JSON object with these fields:
- title: string (ATS-optimized title line)
- summary: string (keyword-rich tailored summary with soft skill phrases woven in)
- experience: array of { title, company, startDate, endDate, location, description, achievements }
- hardSkills: array of strings (all relevant technical skills, no limit)
- softSkills: array of strings (8-10 when available, max 10)
- strengths: array of { title, description }
- coverLetter: string (cover letter body only, 2–4 paragraphs, no salutation or sign-off)

Return ONLY valid JSON, no other text.`, provider, 4000, 0.7);
    try {
        const jsonText = extractJSON(content);
        const parsed = JSON.parse(jsonText);
        return normalizeTailoredContent(parsed, jobAnalysis, profile);
    }
    catch {
        console.error('Failed to parse model response:', content);
        throw new Error('Failed to parse tailored resume response');
    }
}
/**
 * Generate a cover letter body when no job description is provided.
 * Returns only the body text (no salutation or sign-off).
 */
async function generateCoverLetter(profile, companyName, role, provider = DEFAULT_PROVIDER) {
    const content = await createTextCompletion(`You are an expert cover letter writer. Write a professional cover letter BODY for the following candidate applying to a job.

PROFILE:
${JSON.stringify(profile, null, 2)}

APPLICATION:
- Company: ${companyName}
- Role: ${role}

INSTRUCTIONS:
- Write 2–4 short paragraphs expressing interest in the role and company
- Connect the candidate's experience and skills to the role
- Mention 1–2 specific relevant achievements
- Keep tone professional, concise, and confident
- Do NOT include "Dear Hiring Manager", "Best regards", or any salutation/sign-off—ONLY the body paragraphs

Return ONLY the cover letter body text, no JSON or other formatting.`, provider, 1500, 0.7);
    return content.trim();
}
async function extractTemplateFromPDF(pdfText, templateName, provider = DEFAULT_PROVIDER) {
    const content = await createTextCompletion(`Analyze this resume text and create a Handlebars HTML template that replicates its structure and layout.

RESUME TEXT:
${pdfText}

Create a professional, ATS-friendly HTML template with embedded CSS that:
1. Replicates the section structure (identify sections like Summary, Experience, Education, Skills, etc.)
2. Uses semantic HTML (no tables for layout)
3. Uses clean, professional typography
4. Is single-column for ATS compatibility
5. Uses Handlebars syntax for dynamic content

HANDLEBARS VARIABLES TO USE:
- {{name}} - Full name
- {{title}} - Professional title/tagline
- {{contact.phone}}, {{contact.email}}, {{contact.linkedin}}, {{contact.location}}
- {{summary}} - Professional summary
- {{#each experience}} with {{title}}, {{company}}, {{startDate}}, {{endDate}}, {{location}}, {{description}}, {{#each achievements}}
- {{#each skills}} - Individual skill
- {{#each strengths}} with {{title}}, {{description}}
- {{#each education}} with {{degree}}, {{institution}}, {{startDate}}, {{endDate}}, {{location}}

Return a JSON object with:
- html: the complete HTML template with embedded <style> tag (Handlebars syntax)
- css: any additional CSS (can be empty if all CSS is in the HTML)
- sections: array of section names detected (e.g., ["summary", "experience", "skills", "education"])

Return ONLY valid JSON, no other text.`, provider, 8000);
    try {
        const jsonText = extractJSON(content);
        return JSON.parse(jsonText);
    }
    catch {
        console.error('Failed to parse model response:', content);
        throw new Error('Failed to parse template extraction response');
    }
}
async function extractProfileFromResume(resumeText, provider = DEFAULT_PROVIDER) {
    const content = await createTextCompletion(`Extract structured profile data from this resume text. Be thorough and extract ALL information.

RESUME TEXT:
${resumeText}

Extract and return a JSON object with these EXACT fields:
{
  "name": "Full Name",
  "title": "Professional Title (e.g., Senior Software Engineer)",
  "contact": {
    "email": "email@example.com",
    "phone": "+1234567890",
    "location": "City, Country",
    "linkedin": "https://linkedin.com/in/username (or null if not found)"
  },
  "summary": "Professional summary paragraph",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY or Present",
      "location": "City, Country",
      "description": "Brief role description",
      "achievements": ["Achievement 1", "Achievement 2", "..."]
    }
  ],
  "skills": ["Skill1", "Skill2", "..."],
  "strengths": [
    {
      "title": "Strength Name",
      "description": "Brief description of the strength"
    }
  ],
  "education": [
    {
      "degree": "Degree Name (e.g., Bachelor's in Computer Science)",
      "institution": "University Name",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY",
      "location": "City, Country"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "MM/YYYY"
    }
  ]
}

IMPORTANT:
- Extract ALL experience entries, not just the first one
- Extract ALL skills mentioned anywhere in the resume
- Extract ALL achievements/bullet points under each job
- If a field is not found, use empty string or empty array as appropriate
- For dates, use MM/YYYY format when possible
- If strengths section doesn't exist, create 2-3 based on the profile's experience

Return ONLY valid JSON, no other text.`, provider, 4000);
    try {
        const jsonText = extractJSON(content);
        return JSON.parse(jsonText);
    }
    catch {
        console.error('Failed to parse model response:', content);
        throw new Error('Failed to parse profile extraction response');
    }
}
//# sourceMappingURL=claude.js.map