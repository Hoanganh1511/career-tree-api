import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { extractBearer } from './extract-bearer';
import { AuthenticatedRequest } from './authenticated-request';
import { AUDIENCE_API, TOKEN_ISSUER } from './token-audience';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearer(req.headers.authorization);
    if (!token) throw new UnauthorizedException();

    let payload: { sub?: string; iat?: number };
    try {
      // `audience` + `issuer`: token sync (aud khac) bi tu choi ngay tai day,
      // khong con phu thuoc vao viec no tinh co thieu `sub` nhu truoc.
      payload = await this.jwt.verifyAsync<{ sub?: string; iat?: number }>(
        token,
        { audience: AUDIENCE_API, issuer: TOKEN_ISSUER },
      );
    } catch {
      throw new UnauthorizedException();
    }

    if (!payload?.sub || !payload.iat) throw new UnauthorizedException();

    // Chot chan "dang xuat khoi moi thiet bi": token phat hanh TRUOC moc
    // tokensValidAfter deu vo hieu. Phai kiem o day (thay vi tin vao session
    // cookie) vi session cua Auth.js la JWT stateless - server khong giu ban
    // ghi nao de xoa. Doi lai la 1 luot doc theo khoa chinh moi request, cung
    // muc chi phi voi OwnershipService dang lam san.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokensValidAfter: true },
    });
    if (!user) throw new UnauthorizedException();

    if (user.tokensValidAfter) {
      // `iat` tinh bang giay, lam tron xuong -> token phat hanh cung giay voi
      // luc thu hoi co the bi coi la "truoc" moc. So sanh theo giay o ca 2 ve
      // va dung dau > de token phat hanh dung giay do van hop le.
      const issuedAt = payload.iat;
      const validAfter = Math.floor(user.tokensValidAfter.getTime() / 1000);
      if (issuedAt < validAfter) throw new UnauthorizedException();
    }

    req.userId = payload.sub;
    return true;
  }
}
