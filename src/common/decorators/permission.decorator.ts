import { SetMetadata } from '@nestjs/common';
import { Label, RoleActions } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (label: Label, action: RoleActions) =>
  SetMetadata(PERMISSIONS_KEY, { label, action });
