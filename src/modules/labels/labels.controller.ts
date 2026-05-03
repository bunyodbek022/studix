import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { LabelsService } from './labels.service';
import type { LabelNamesResponse, LabelsResponse } from './labels.types';

type AuthenticatedRequest = Request & {
  user?: {
    id?: number;
    role?: string;
  };
};

@ApiTags('Labels')
@Controller('labels')
@UseGuards(AuthGuard)
@ApiCookieAuth('access_token')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Get()
  @ApiOperation({
    summary: 'Foydalanuvchi roli boyicha sidebar label ro-yxati',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            key: 'dashboard',
            title: 'Dashboard',
            path: '/dashboard',
            order: 1,
          },
        ],
        meta: {
          role: 'ADMIN',
          total: 1,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token topilmadi yoki yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Role topilmadi yoki yaroqsiz' })
  getLabels(@Req() req: AuthenticatedRequest): LabelsResponse {
    return this.labelsService.getLabels(req.user?.role);
  }

  @Get('names')
  @ApiOperation({
    summary: 'Foydalanuvchi roli boyicha faqat label nomlari',
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: ['Dashboard', 'Students', 'Teachers'],
        meta: {
          role: 'ADMIN',
          total: 3,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token topilmadi yoki yaroqsiz' })
  @ApiForbiddenResponse({ description: 'Role topilmadi yoki yaroqsiz' })
  getLabelNames(@Req() req: AuthenticatedRequest): LabelNamesResponse {
    return this.labelsService.getLabelNames(req.user?.role);
  }
}
