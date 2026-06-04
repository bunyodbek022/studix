import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from '@prisma/client';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth('access_token')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(+id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(+id, updateBranchDto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.CREATOR)
  remove(@Param('id') id: string) {
    return this.branchesService.remove(+id);
  }
}
