import { Profile } from '../types/profile';
export interface GeneratedPathInfo {
    /** Relative path base: {profile}/{date}/{company}/{role} */
    relativeBase: string;
    /** Absolute directory for writing files */
    absoluteDir: string;
    profileSlug: string;
    companyFolderName: string;
    roleSlug: string;
}
/**
 * Compute output path for generated files.
 * Structure: {profile}/{date}/{company}/{role}/
 */
export declare function getGeneratedOutputPath(profile: Profile, companyName: string, role: string): Promise<GeneratedPathInfo>;
//# sourceMappingURL=generatedPath.d.ts.map