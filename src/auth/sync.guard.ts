import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { extractBearer } from './extract-bearer';

@Injectable()
export class SyncGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = extractBearer(req.headers.authorization);
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<{ purpose?: string }>(token);
      if (payload?.purpose !== 'sync') throw new UnauthorizedException();
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
