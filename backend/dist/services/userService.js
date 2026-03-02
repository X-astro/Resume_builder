"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.findByEmail = findByEmail;
exports.findById = findById;
exports.validatePassword = validatePassword;
exports.getUserMultipleProfileIds = getUserMultipleProfileIds;
exports.setUserMultipleProfileIds = setUserMultipleProfileIds;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const USERS_DIR = path_1.default.join(__dirname, '../../data/users');
async function ensureUsersDir() {
    try {
        await promises_1.default.access(USERS_DIR);
    }
    catch {
        await promises_1.default.mkdir(USERS_DIR, { recursive: true });
    }
}
function userFilePath(id) {
    return path_1.default.join(USERS_DIR, `${id}.json`);
}
async function createUser(dto) {
    await ensureUsersDir();
    const email = dto.email.trim().toLowerCase();
    if (!email || !dto.password || dto.password.length < 6) {
        throw new Error('Email and password (min 6 chars) are required');
    }
    const existing = await findByEmail(email);
    if (existing) {
        throw new Error('Email already registered');
    }
    const passwordHash = await bcrypt_1.default.hash(dto.password, 10);
    const now = new Date().toISOString();
    const user = {
        id: (0, uuid_1.v4)(),
        email,
        passwordHash,
        name: dto.name?.trim(),
        multipleProfileIds: [],
        createdAt: now,
        updatedAt: now,
    };
    await promises_1.default.writeFile(userFilePath(user.id), JSON.stringify(user, null, 2));
    const { passwordHash: _, ...rest } = user;
    return rest;
}
async function findByEmail(email) {
    const normalized = email.trim().toLowerCase();
    const files = await promises_1.default.readdir(USERS_DIR).catch(() => []);
    for (const file of files) {
        if (!file.endsWith('.json'))
            continue;
        try {
            const content = await promises_1.default.readFile(path_1.default.join(USERS_DIR, file), 'utf-8');
            const user = JSON.parse(content);
            if (user.email === normalized)
                return user;
        }
        catch {
            /* skip invalid */
        }
    }
    return null;
}
async function findById(id) {
    try {
        const content = await promises_1.default.readFile(userFilePath(id), 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
async function validatePassword(user, password) {
    return bcrypt_1.default.compare(password, user.passwordHash);
}
async function getUserMultipleProfileIds(userId) {
    const user = await findById(userId);
    return user?.multipleProfileIds ?? [];
}
async function setUserMultipleProfileIds(userId, profileIds) {
    const user = await findById(userId);
    if (!user)
        throw new Error('User not found');
    const ids = profileIds.filter((id) => typeof id === 'string');
    user.multipleProfileIds = ids;
    user.updatedAt = new Date().toISOString();
    await promises_1.default.writeFile(userFilePath(user.id), JSON.stringify(user, null, 2));
    return ids;
}
//# sourceMappingURL=userService.js.map