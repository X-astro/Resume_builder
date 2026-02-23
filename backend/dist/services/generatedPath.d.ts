import { Profile } from '../types/profile';
export interface GeneratedPathInfo {
    /** Relative path base: {profile}/{date}/{count+1}_{company}/{role} */
    relativeBase: string;
    /** Absolute directory for writing files */
    absoluteDir: string;
    profileSlug: string;
    companyFolderName: string;
    roleSlug: string;
}
/**
 * Compute output path for generated files.
 * Structure: {profile}/{date}/{count+1}_{company}/{role}/
 * Count = number of folders in {profile}/{date}, then create {count+1}_{companyname}
 */
export declare function getGeneratedOutputPath(profile: Profile, companyName: string, role: string): Promise<GeneratedPathInfo>;
//# sourceMappingURL=generatedPath.d.ts.map