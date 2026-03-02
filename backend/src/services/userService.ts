import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../types/user';

const USERS_DIR = path.join(__dirname, '../../data/users');

async function ensureUsersDir(): Promise<void> {
  try {
    await fs.access(USERS_DIR);
  } catch {
    await fs.mkdir(USERS_DIR, { recursive: true });
  }
}

function userFilePath(id: string): string {
  return path.join(USERS_DIR, `${id}.json`);
}

export async function createUser(dto: { email: string; password: string; name?: string }): Promise<Omit<User, 'passwordHash'>> {
  await ensureUsersDir();

  const email = dto.email.trim().toLowerCase();
  if (!email || !dto.password || dto.password.length < 6) {
    throw new Error('Email and password (min 6 chars) are required');
  }

  const existing = await findByEmail(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    email,
    passwordHash,
    name: dto.name?.trim(),
    multipleProfileIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await fs.writeFile(userFilePath(user.id), JSON.stringify(user, null, 2));

  const { passwordHash: _, ...rest } = user;
  return rest;
}

export async function findByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const files = await fs.readdir(USERS_DIR).catch(() => []);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = await fs.readFile(path.join(USERS_DIR, file), 'utf-8');
      const user = JSON.parse(content) as User;
      if (user.email === normalized) return user;
    } catch {
      /* skip invalid */
    }
  }
  return null;
}

export async function findAll(): Promise<Omit<User, 'passwordHash'>[]> {
  await ensureUsersDir();
  const files = await fs.readdir(USERS_DIR).catch(() => []);
  const users: Omit<User, 'passwordHash'>[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const content = await fs.readFile(path.join(USERS_DIR, file), 'utf-8');
      const user = JSON.parse(content) as User;
      const { passwordHash: _, ...rest } = user;
      users.push(rest);
    } catch {
      /* skip invalid */
    }
  }
  return users.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export async function findById(id: string): Promise<User | null> {
  try {
    const content = await fs.readFile(userFilePath(id), 'utf-8');
    return JSON.parse(content) as User;
  } catch {
    return null;
  }
}

export async function validatePassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function getUserMultipleProfileIds(userId: string): Promise<string[]> {
  const user = await findById(userId);
  return user?.multipleProfileIds ?? [];
}

export async function setUserMultipleProfileIds(userId: string, profileIds: string[]): Promise<string[]> {
  const user = await findById(userId);
  if (!user) throw new Error('User not found');

  const ids = profileIds.filter((id) => typeof id === 'string');
  user.multipleProfileIds = ids;
  user.updatedAt = new Date().toISOString();

  await fs.writeFile(userFilePath(user.id), JSON.stringify(user, null, 2));
  return ids;
}
