import { Request, Response, NextFunction } from 'express';
export declare function generateUserToken(userId: string): string;
export declare function decodeUserToken(token: string): {
    userId: string;
} | null;
export declare function userAuthMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=userAuth.d.ts.map