import { AIProvider } from '../types/template';
export type AIModelSettings = {
    openaiEnabled: boolean;
    claudeEnabled: boolean;
};
export declare function getAIModelSettings(): Promise<AIModelSettings>;
export declare function updateAIModelSettings(input: Partial<AIModelSettings>): Promise<AIModelSettings>;
export declare function isProviderEnabled(provider: AIProvider, settings: AIModelSettings): boolean;
export declare function getDefaultEnabledProvider(settings: AIModelSettings): AIProvider;
//# sourceMappingURL=aiModelConfig.d.ts.map