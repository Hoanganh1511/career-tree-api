/* 
  This file acts as a bridge between NestJS and Prisma Client. 
  Here's why it's necessary:
  1. Managing the database connection lifecycle
  2. Turning Prisma Client into a NestJS Provider (Dependency Injection)
  3. Extending instead of wrapping 
  4. Single source of truth - one shared instance across the app 
*/
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
