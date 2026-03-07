import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/config/multer.config';
import { ApiConsumes } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @UseInterceptors(FileInterceptor('photo', multerConfig))
    @ApiConsumes("multipart/form-data")
    create(
        @Body() createUserDto: CreateUserDto,
        @UploadedFile() file: Express.Multer.File,

    ) {
        const imagePath = file ? file.filename : undefined;
        return this.usersService.create({ ...createUserDto, photo: imagePath });
    }

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(+id);
    }

    @Patch(':id')
    @UseInterceptors(FileInterceptor('photo', multerConfig))
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @UploadedFile() file: Express.Multer.File,) {
        const imagePath = file ? file.filename : undefined;
        return this.usersService.update(+id, { ...updateUserDto, photo: imagePath });
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(+id);
    }
}
