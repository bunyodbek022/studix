import { Request } from 'express';
import { Role } from '@prisma/client';

export interface TokenPayload {
  id: number;
  role: Role;
  email: string;
  branchId?: number;
  customRole?: string;
  position?: string;
}

export interface RequestWithUser extends Request {
  user: TokenPayload;
}
