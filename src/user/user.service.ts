import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { SyncUserDto } from './dto/sync-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async syncUser(dto: SyncUserDto): Promise<{ id: string }> {
    await this.ensureSystemFlagRow();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { googleId: dto.googleId },
        update: { email: dto.email, name: dto.name },
        create: { googleId: dto.googleId, email: dto.email, name: dto.name },
      });

      const claim = await tx.systemFlag.updateMany({
        where: { id: 1, legacyBackfillDone: false },
        data: { legacyBackfillDone: true },
      });

      if (claim.count === 1) {
        await tx.workspace.updateMany({
          where: { ownerId: null },
          data: { ownerId: user.id },
        });
      } else {
        const ownWorkspaceCount = await tx.workspace.count({
          where: { ownerId: user.id },
        });
        if (ownWorkspaceCount === 0) {
          await tx.workspace.create({
            data: { name: 'My Career Tree', ownerId: user.id },
          });
        }
      }

      return { id: user.id };
    });
  }

  private async ensureSystemFlagRow(): Promise<void> {
    try {
      await this.prisma.systemFlag.create({
        data: { id: 1, legacyBackfillDone: false },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return;
      }
      throw e;
    }
  }
}
