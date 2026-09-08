/* 
  This file acts as a bridge between NestJS and Prisma Client. 
  Here's why it's necessary:
  1. Managing the database connection lifecycle
  2. Turning Prisma Client into a NestJS Provider (Dependency Injection)
  3. Extending instead of wrapping 
  4. Single source of truth - one shared instance across the app 
*/
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
      // Neon (serverless, qua pooler endpoint -pooler.*) doi khi mat vai giay
      // de "danh thuc" compute/cap connection tu pool - default cua Prisma
      // (maxWait 2s cho tu luc cho connection, timeout 5s cho ca transaction)
      // qua ngan, gay P2028 "Unable to start a transaction in the given
      // time" (khong phai loi code, chi la cho connection lau hon 2s). Noi
      // rong 2 moc nay o muc CLIENT (ap dung cho MOI $transaction trong app,
      // vd UserService.syncUser/completeOnboarding, ChatService.addGroupMembers...)
      // thay vi sua tung noi goi $transaction rieng le.
      transactionOptions: { maxWait: 10_000, timeout: 15_000 },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
