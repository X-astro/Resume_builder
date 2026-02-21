import { Profile } from '../types/profile';
import { TailoredContent, Template } from '../types/template';
export declare function generateResumePDF(profile: Profile, template: Template, tailoredContent?: TailoredContent, companyName?: string, role?: string): Promise<string>;
export declare function generatePreviewHTML(profile: Profile, template: Template, tailoredContent?: TailoredContent): Promise<string>;
export declare function getGeneratedPDFPath(filename: string): Promise<string | null>;
//# sourceMappingURL=pdfGenerator.d.ts.map