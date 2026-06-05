import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ReasonsService } from './reasons.service';
import { CreateReasonDto } from './dto/create-reason.dto';
import { UpdateReasonDto } from './dto/update-reason.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Reasons')
@UseGuards(AuthGuard)
@Controller('reasons')
export class ReasonsController {
  constructor(private readonly reasonsService: ReasonsService) {}

  @Post()
  create(@Body() createReasonDto: CreateReasonDto, @Req() req: RequestWithUser) {
    return this.reasonsService.create(createReasonDto, req.user);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.reasonsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reasonsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReasonDto: UpdateReasonDto) {
    return this.reasonsService.update(+id, updateReasonDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reasonsService.remove(+id);
  }
}
