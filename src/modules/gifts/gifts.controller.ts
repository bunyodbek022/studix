import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { GiftsService } from './gifts.service';
import { CreateGiftDto } from './dto/create-gift.dto';
import { UpdateGiftDto } from './dto/update-gift.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/config/multer.config';

@ApiTags('Gifts')
@UseGuards(AuthGuard)
@Controller('gifts')
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiConsumes('multipart/form-data')
  create(@Body() createGiftDto: CreateGiftDto, @UploadedFile() file: Express.Multer.File, @Req() req: RequestWithUser) {
    return this.giftsService.create(createGiftDto, file, req.user);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.giftsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.giftsService.findOne(+id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiConsumes('multipart/form-data')
  update(@Param('id') id: string, @Body() updateGiftDto: UpdateGiftDto, @UploadedFile() file: Express.Multer.File) {
    return this.giftsService.update(+id, updateGiftDto, file);
  }

  @Post(':id/buy')
  buy(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.giftsService.buy(+id, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.giftsService.remove(+id);
  }
}
