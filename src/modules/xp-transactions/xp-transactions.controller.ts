import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { XpTransactionsService } from './xp-transactions.service';
import { CreateXpTransactionDto } from './dto/create-xp-transaction.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('XP Transactions')
@UseGuards(AuthGuard)
@Controller('xp-transactions')
export class XpTransactionsController {
  constructor(private readonly xpTransactionsService: XpTransactionsService) {}

  @Post()
  create(@Body() createXpTransactionDto: CreateXpTransactionDto, @Req() req: RequestWithUser) {
    console.log(req.user);
    
    return this.xpTransactionsService.create(createXpTransactionDto, req.user);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.xpTransactionsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.xpTransactionsService.findOne(+id);
  }
}
