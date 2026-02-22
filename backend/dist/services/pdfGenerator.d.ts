import { Profile } from '../types/profile';
import { TailoredContent, Template } from '../types/template';
export declare function prepareResumeRenderData(profile: Profile, tailoredContent?: TailoredContent, companyName?: string, role?: string): {
    summary: string;
    experience: import("../types/profile").Experience[];
    skills: string[];
    hardSkills?: string[] | undefined;
    softSkills?: string[] | undefined;
    strengths: import("../types/profile").Strength[];
    companyName: string;
    role: string;
    title: string;
    id: string;
    name: string;
    totalYearsExperience?: number;
    preferredTemplate?: string;
    disabled?: boolean;
    contact: import("../types/profile").Contact;
    education: import("../types/profile").Education[];
    certifications?: import("../types/profile").Certification[];
    createdAt: string;
    updatedAt: string;
};
export declare function generateResumePDF(profile: Profile, template: Template, tailoredContent?: TailoredContent, companyName?: string, role?: string): Promise<string>;
export declare function generatePreviewHTML(profile: Profile, template: Template, tailoredContent?: TailoredContent): Promise<string>;
export declare function getGeneratedPDFPath(filename: string): Promise<string | null>;
//# sourceMappingURL=pdfGenerator.d.ts.map