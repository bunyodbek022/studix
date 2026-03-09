import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { StudentGroupService } from './student-group.service';
import { CreateStudentGroupDto } from './dto/create-student-group.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';

@Controller('student-group')
@ApiCookieAuth("access_token")
export class StudentGroupController {
    constructor(private readonly studentGroupServise : StudentGroupService){}

    @ApiOperation({
        summary:`${Role.SUPERADMIN}, ${Role.ADMIN}`
    })
    @UseGuards(AuthGuard,RolesGuard)
    @Roles("ADMIN","SUPERADMIN")
    @Post()
    createStudentGroup(
        @Body() payload : CreateStudentGroupDto,
        @Req() req : Request
    ){
        return this.studentGroupServise.createStudentGroup(payload, req["user"])
    }
}
