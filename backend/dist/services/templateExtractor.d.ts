import { Template } from '../types/template';
export declare function extractAndSaveTemplate(pdfBuffer: Buffer, templateName: string, originalFilename: string): Promise<Template>;
export declare function getAllTemplates(): Promise<Template[]>;
export declare function getTemplateById(id: string): Promise<Template | null>;
export declare function updateTemplate(id: string, updates: Partial<Pick<Template, 'disabled'>>): Promise<Template | null>;
export declare function deleteTemplate(id: string): Promise<boolean>;
export declare function createDefaultTemplate(): Promise<Template>;
//# sourceMappingURL=templateExtractor.d.ts.map