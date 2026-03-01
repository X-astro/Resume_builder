const DEFAULT_LOCAL_API_BASE = 'http://localhost:3001/api';
const FALLBACK_API_BASE = 'http://100.1.15.1:3001/api';
const CONFIGURED_API_BASE = process.env.NEXT_PUBLIC_API_URL || DEFAULT_LOCAL_API_BASE;
let resolvedApiBase = CONFIGURED_API_BASE;

function buildApiBaseCandidates(): string[] {
  const candidates = [resolvedApiBase, CONFIGURED_API_BASE];
  if (!CONFIGURED_API_BASE.includes('100.1.15.1')) {
    candidates.push(FALLBACK_API_BASE);
  }
  return [...new Set(candidates)];
}

function getCurrentApiBase(): string {
  return resolvedApiBase;
}

export function getApiOrigin(): string {
  return getCurrentApiBase().replace(/\/api$/, '');
}

// Auth helpers
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('adminToken');
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem('adminToken', token);
  } catch {
    // Ignore storage errors (private mode / blocked storage)
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem('adminToken');
  } catch {
    // Ignore storage errors
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  let lastConnectionError: Error | null = null;

  for (const apiBase of buildApiBaseCandidates()) {
    const url = `${apiBase}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
      }

      resolvedApiBase = apiBase;
      return response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isConnectionIssue =
        message.includes('fetch') ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError');

      if (!isConnectionIssue) {
        throw error;
      }

      lastConnectionError = error instanceof Error ? error : new Error(message);
    }
  }

  throw lastConnectionError ?? new Error('Unable to connect to backend');
}

// Admin API
export interface AIModelSettings {
  openaiEnabled: boolean;
  claudeEnabled: boolean;
}

export const adminApi = {
  login: (password: string) =>
    apiFetch<{ token: string; message: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logout: () =>
    apiFetch<{ message: string }>('/admin/logout', {
      method: 'POST',
    }),

  verify: () =>
    apiFetch<{ valid: boolean }>('/admin/verify'),

  getAIModels: () =>
    apiFetch<AIModelSettings>('/admin/ai-models'),

  updateAIModels: (data: Partial<AIModelSettings>) =>
    apiFetch<AIModelSettings>('/admin/ai-models', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Profile types
export interface Contact {
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  location: string;
}

export interface Experience {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  achievements: string[];
}

export interface Strength {
  title: string;
  description: string;
}

export interface Education {
  degree: string;
  institution: string;
  startDate: string;
  endDate: string;
  location: string;
}

export interface Profile {
  id: string;
  name: string;
  title: string;
  totalYearsExperience?: number;
  preferredTemplate?: string;
  disabled?: boolean;
  contact: Contact;
  summary: string;
  experience: Experience[];
  strengths: Strength[];
  skills?: string[];
  hardSkills?: string[];
  softSkills?: string[];
  education: Education[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileDTO {
  name?: string;
  title?: string;
  totalYearsExperience?: number;
  contact?: Partial<Contact>;
  summary?: string;
  experience?: Partial<Experience>[];
  strengths?: Partial<Strength>[];
  skills?: string[];
  hardSkills?: string[];
  softSkills?: string[];
  education?: Partial<Education>[];
  preferredTemplate?: string;
  disabled?: boolean;
}

// Template types
export interface ManualTemplateConfigStored {
  name: string;
  description?: string;
  columns: 1 | 2;
  accentColor?: string;
  bodyColor?: string;
  bodyFontSizePt?: number;
  titleFontSizePt?: number;
  sectionOrder?: string[];
  leftSectionOrder?: string[];
  rightSectionOrder?: string[];
  nameStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: string };
  headerTitleStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: string };
  contactStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: string };
  sectionStyles?: Record<string, Record<string, { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: string }>>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  disabled?: boolean;
  htmlContent: string;
  cssContent: string;
  sections: string[];
  createdAt: string;
  updatedAt: string;
  manualConfig?: ManualTemplateConfigStored;
}

// Job Analysis types
export interface JobAnalysis {
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
  experienceLevel: string;
  keyResponsibilities: string[];
  industryTerms: string[];
  softSkills: string[];
  certifications: string[];
  jobTitle: string;
  companyInfo?: string;
}

export type AIProvider = 'openai' | 'claude';

// Profiles API
export const profilesApi = {
  getAll: (options?: { includeDisabled?: boolean }) =>
    apiFetch<Profile[]>(
      options?.includeDisabled ? '/profiles?includeDisabled=true' : '/profiles'
    ),

  getById: (id: string) => apiFetch<Profile>(`/profiles/${id}`),

  create: (data: CreateProfileDTO) =>
    apiFetch<Profile>('/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateProfileDTO>) =>
    apiFetch<Profile>(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/profiles/${id}`, {
      method: 'DELETE',
    }),

  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append('resume', file);
    return apiFetch<Profile>('/profiles/upload', {
      method: 'POST',
      body: formData,
    });
  },
};

// Templates API
export const templatesApi = {
  getAll: (options?: { includeDisabled?: boolean }) =>
    apiFetch<Template[]>(
      options?.includeDisabled ? '/templates?includeDisabled=true' : '/templates'
    ),

  getById: (id: string) => apiFetch<Template>(`/templates/${id}`),

  update: (id: string, data: { disabled?: boolean; name?: string; description?: string }) =>
    apiFetch<Template>(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  upload: async (file: File, name: string): Promise<Template> => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('name', name);

    return apiFetch<Template>('/templates/upload', {
      method: 'POST',
      body: formData,
    });
  },

  uploadJson: async (file: File): Promise<Template> => {
    const formData = new FormData();
    formData.append('template', file);

    return apiFetch<Template>('/templates/upload-json', {
      method: 'POST',
      body: formData,
    });
  },

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/templates/${id}`, {
      method: 'DELETE',
    }),

  updateManual: (id: string, config: {
    name: string;
    description?: string;
    columns?: 1 | 2;
    accentColor?: string;
    bodyColor?: string;
    bodyFontSizePt?: number;
    titleFontSizePt?: number;
    sectionOrder?: string[];
    leftSectionOrder?: string[];
    rightSectionOrder?: string[];
    nameStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    headerTitleStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    contactStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    titleStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    subTitleStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    paragraphStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    sectionStyles?: Record<string, Record<string, { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: string }>>;
  }) =>
    apiFetch<Template>(`/templates/${id}/update-manual`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  createManual: (config: {
    name: string;
    description?: string;
    columns?: 1 | 2;
    accentColor?: string;
    bodyColor?: string;
    bodyFontSizePt?: number;
    titleFontSizePt?: number;
    sectionOrder?: string[];
    leftSectionOrder?: string[];
    rightSectionOrder?: string[];
    nameStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    headerTitleStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    contactStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    titleStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    subTitleStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    paragraphStyle?: { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: 'normal' | 'bold' };
    sectionStyles?: Record<string, Record<string, { color?: string; fontSizePt?: number; fontFamily?: string; fontWeight?: string }>>;
  }) =>
    apiFetch<Template>('/templates/create-manual', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
};

// Resume API
export const resumeApi = {
  getModels: () => apiFetch<AIModelSettings>('/resume/models'),

  analyze: (jobDescription: string, model: AIProvider) =>
    apiFetch<JobAnalysis>('/resume/analyze', {
      method: 'POST',
      body: JSON.stringify({ jobDescription, model }),
    }),

  generate: (data: {
    profileId: string;
    templateId: string;
    jobDescription?: string;
    jobAnalysis?: JobAnalysis;
    companyName: string;
    role: string;
    model: AIProvider;
    format?: 'pdf' | 'docx' | 'both';
  }) =>
    apiFetch<
      | { filename: string; downloadUrl: string; tailored: boolean; format?: 'pdf' | 'docx' }
      | {
          pdf: { filename: string; downloadUrl: string };
          docx: { filename: string; downloadUrl: string };
          coverLetter?: {
            pdf: { filename: string; downloadUrl: string };
            docx: { filename: string; downloadUrl: string };
          };
          tailored: boolean;
        }
    >(
      '/resume/generate',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  generateAll: (data: {
    templateId?: string;
    jobDescription?: string;
    jobAnalysis?: JobAnalysis;
    companyName: string;
    role: string;
    model: AIProvider;
    format?: 'pdf' | 'docx' | 'both';
  }) =>
    apiFetch<{
      generated: number;
      results: Array<{
        profileId: string;
        profileName: string;
        pdf?: string;
        docx?: string;
        coverLetterPdf?: string;
        coverLetterDocx?: string;
      }>;
      tailored: boolean;
    }>('/resume/generate-all', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  preview: (data: {
    profileId: string;
    templateId: string;
    jobDescription?: string;
    jobAnalysis?: JobAnalysis;
    model: AIProvider;
  }) =>
    apiFetch<{ html: string; tailored: boolean }>('/resume/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDownloadUrl: (filename: string) =>
    `${getCurrentApiBase()}/resume/download/${filename}`,
};
