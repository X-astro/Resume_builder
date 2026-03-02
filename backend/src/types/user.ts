export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  multipleProfileIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name?: string;
}
