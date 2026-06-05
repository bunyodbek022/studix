import { Module } from '@nestjs/common';
import { XpTransactionsController } from './xp-transactions.controller';
import { XpTransactionsService } from './xp-transactions.service';

@Module({
  controllers: [XpTransactionsController],
  providers: [XpTransactionsService]
})
export class XpTransactionsModule {}
