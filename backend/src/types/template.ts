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
}

export interface CreateTemplateDTO {
  name: string;
  description?: string;
}

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

export interface TailoredContent {
  title: string;
  summary: string;
  experience: TailoredExperience[];
  skills: string[];
  hardSkills: string[];
  softSkills: string[];
  // Optional fields from job analysis merged into tailored content
  requiredSkills?: string[];
  preferredSkills?: string[];
  strengths: TailoredStrength[];
  /** Cover letter body (content between "Dear Hiring Manager" and "Best regards") */
  coverLetter?: string;
}

export interface TailoredExperience {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  achievements: string[];
}

export interface TailoredStrength {
  title: string;
  description: string;
}

export type ResumeFormat = 'pdf' | 'docx' | 'both';

export interface GenerateResumeRequest {
  profileId: string;
  templateId: string;
  jobDescription: string;
  jobAnalysis?: JobAnalysis;
  model?: AIProvider;
  companyName: string;
  role: string;
  format?: ResumeFormat;
}
