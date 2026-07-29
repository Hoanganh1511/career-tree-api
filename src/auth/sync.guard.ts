import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { extractBearer } from './extract-bearer';
import { AUDIENCE_SYNC, TOKEN_ISSUER } from './token-audience';

@Injectable()
export class SyncGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = extractBearer(req.headers.authorization);
    if (!token) throw new UnauthorizedException();

    try {
      // `audience` + `issuer` khien token API (aud khac) bi tu choi ngay o
      // buoc verify, khong con phu thuoc vao viec no "tinh co" thieu claim.
      const payload = await this.jwt.verifyAsync<{ purpose?: string }>(token, {
        audience: AUDIENCE_SYNC,
        issuer: TOKEN_ISSUER,
      });
      if (payload?.purpose !== 'sync') throw new UnauthorizedException();
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
