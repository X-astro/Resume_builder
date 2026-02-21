import { Profile } from '../types/profile';
import { AIProvider, JobAnalysis, TailoredContent } from '../types/template';
declare const DEFAULT_PROVIDER: AIProvider;
export declare function resolveAIProvider(model?: string): AIProvider;
export declare function analyzeJobDescription(jobDescription: string, provider?: AIProvider): Promise<JobAnalysis>;
export declare function tailorResume(profile: Profile, jobAnalysis: JobAnalysis, provider?: AIProvider): Promise<TailoredContent>;
export declare function extractTemplateFromPDF(pdfText: string, templateName: string, provider?: AIProvider): Promise<{
    html: string;
    css: string;
    sections: string[];
}>;
export declare function extractProfileFromResume(resumeText: string, provider?: AIProvider): Promise<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>;
export { DEFAULT_PROVIDER };
//# sourceMappingURL=claude.d.ts.map