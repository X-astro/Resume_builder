import type { User, CreateUserDTO } from '../types/user';
export declare function createUser(dto: CreateUserDTO): Promise<Omit<User, 'passwordHash'>>;
export declare function findByEmail(email: string): Promise<User | null>;
export declare function findById(id: string): Promise<User | null>;
export declare function validatePassword(user: User, password: string): Promise<boolean>;
export declare function getUserMultipleProfileIds(userId: string): Promise<string[]>;
export declare function setUserMultipleProfileIds(userId: string, profileIds: string[]): Promise<string[]>;
//# sourceMappingURL=userService.d.ts.map