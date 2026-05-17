import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CentersService } from './centers.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '@prisma/client';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Centers')
@Controller('centers')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Post()
  @Roles(Role.SUPERADMIN)
  create(@Body() createCenterDto: CreateCenterDto) {
    return this.centersService.create(createCenterDto);
  }

  @Get()
  @Roles(Role.SUPERADMIN)
  findAll() {
    return this.centersService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  findOne(@Param('id') id: string) {
    return this.centersService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  update(@Param('id') id: string, @Body() updateCenterDto: UpdateCenterDto) {
    return this.centersService.update(+id, updateCenterDto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.centersService.remove(+id);
  }
}
