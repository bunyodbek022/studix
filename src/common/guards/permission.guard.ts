import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, Label, RoleActions } from '@prisma/client';
import PrismaService from 'src/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<{
      label: Label;
      action: RoleActions;
    }>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      return true; // No specific permissions required
    }

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;

    if (!user) {
      return false;
    }

    // Superadmin and Creator have full access
    if (user.role === Role.SUPERADMIN || user.role === Role.CREATOR) {
      return true;
    }

    // For ADMIN role, check custom permissions
    if (user.role === Role.ADMIN) {
      // The role string in RolePermission model corresponds to the custom role name (user.customRole)
      // but you also mentioned `name` is the profession. User has `position` and `customRole`.
      const customRoleName = user.customRole || user.position;

      if (!customRoleName) {
        throw new ForbiddenException(
          'User does not have an assigned profession/role',
        );
      }

      const rolePermission = await this.prisma.rolePermission.findFirst({
        where: {
          name: customRoleName,
          category: requiredPermission.label,
        },
      });

      if (
        rolePermission &&
        rolePermission.actions.includes(requiredPermission.action)
      ) {
        return true;
      }
      throw new ForbiddenException(
        `You do not have ${requiredPermission.action} permission for ${requiredPermission.label}`,
      );
    }

    return false;
  }
}
