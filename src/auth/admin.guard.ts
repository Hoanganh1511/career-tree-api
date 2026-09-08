import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from './authenticated-request';

// Chi dung cho GL Daily Diary (route duoi DiaryController) - app KHONG co
// khai niem admin toan cuc nao khac (khac CommunityMemberRole, scoped rieng
// theo tung community). Chay SAU JwtAuthGuard (global qua APP_GUARD, xem
// auth.module.ts) nen req.userId da chac chan co san.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) throw new ForbiddenException();
    return true;
  }
}
