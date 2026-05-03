import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LABEL_DEFINITIONS } from './labels.constants';
import type {
  LabelDefinition,
  LabelItem,
  LabelNamesResponse,
  LabelsResponse,
} from './labels.types';

@Injectable()
export class LabelsService {
  getLabels(roleFromToken?: string): LabelsResponse {
    const role = this.parseRole(roleFromToken);
    const labels = this.getAllowedLabels(role);

    return {
      success: true,
      data: labels,
      meta: {
        role,
        total: labels.length,
      },
    };
  }

  getLabelNames(roleFromToken?: string): LabelNamesResponse {
    const role = this.parseRole(roleFromToken);
    const names = this.getAllowedLabels(role).map((label) => label.title);

    return {
      success: true,
      data: names,
      meta: {
        role,
        total: names.length,
      },
    };
  }

  private getAllowedLabels(role: Role): LabelItem[] {
    return LABEL_DEFINITIONS.filter((label) => this.canReadLabel(label, role))
      .sort((a, b) => a.order - b.order)
      .map((label) => ({
        key: label.key,
        title: label.title,
        path: label.path,
        order: label.order,
      }));
  }

  private canReadLabel(label: LabelDefinition, role: Role): boolean {
    return label.roles.includes(role);
  }

  private parseRole(role?: string): Role {
    if (!role) {
      throw new ForbiddenException('No roles found');
    }

    if (!Object.values(Role).includes(role as Role)) {
      throw new ForbiddenException('Invalid role');
    }

    return role as Role;
  }
}
