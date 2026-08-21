import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { AUDIENCE_SOCKET, TOKEN_ISSUER } from '../auth/token-audience';

// Danh sach origin duoc phep ket noi socket - CORS rieng cho WebSocket (khac
// HTTP thuong, xem main.ts khong co enableCors vi HTTP luon di qua Next.js
// server, khong bao gio tu trinh duyet - socket thi NGUOC LAI, trinh duyet
// ket noi THANG toi day nen bat buoc phai co CORS). FRONTEND_URL cho phep
// nhieu origin cach nhau boi dau phay (vd domain Vercel + localhost dev).
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',')
  // Bo dau "/" cuoi - Origin header trinh duyet gui KHONG BAO GIO co dau "/"
  // cuoi, de FRONTEND_URL=https://x.com/ (thua 1 dau /) khong am tham gay
  // mismatch (nguyen nhan pho bien nhat cua loi CORS "nhin dung ma van fail").
  .map((s) => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// client.data cua socket.io mac dinh la `any` - Omit<Socket,'data'> & {...}
// (khong phai Socket & {...}, vi giao voi `any` se sup lai thanh `any`) de
// ghi de dung kieu, dung lap lai o ca handleConnection (ghi) va handleDisconnect (doc).
type AuthedSocket = Omit<Socket, 'data'> & { data: { userId?: string } };

// Day thong bao real-time toi dung 1 user - moi client join 1 "room" rieng
// theo userId (`user:${id}`) sau khi xac thuc, KHONG broadcast toan cuc.
// Xac thuc bang CUNG co che JwtAuthGuard dung cho HTTP (cung INTERNAL_API_SECRET,
// cung TOKEN_ISSUER) nhung audience rieng (AUDIENCE_SOCKET, xem token-audience.ts)
// - token nay do FE tu ky (signSocketToken) va gui qua handshake.auth.token
// LUC KET NOI, khac han apiFetch (ky lai token moi cho MOI request).
@Injectable()
@WebSocketGateway({ cors: { origin: allowedOrigins, credentials: true } })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);
  // userId -> so socket dang mo (1 nguoi co the mo nhieu tab/thiet bi cung
  // luc) - "online" = con it nhat 1 socket, KHONG phai boolean don gian, de
  // dong 1 tab khong lam mat trang thai online neu con tab khac dang mo.
  private onlineCounts = new Map<string, number>();

  @WebSocketServer()
  server!: Server;

  constructor(private jwt: JwtService) {
    // Log 1 lan luc boot - cach nhanh nhat de kiem tra tren Render xem
    // FRONTEND_URL da duoc set dung production origin hay chua (thieu bien
    // nay -> chi allow localhost:3000 -> moi ket noi tu production bi CORS).
    this.logger.log(`WebSocket allowed origins: ${allowedOrigins.join(', ')}`);
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token, {
        audience: AUDIENCE_SOCKET,
        issuer: TOKEN_ISSUER,
      });
      if (!payload?.sub) {
        client.disconnect();
        return;
      }
      const userId = payload.sub;
      (client as AuthedSocket).data.userId = userId;
      await client.join(`user:${userId}`);

      const wasOffline = !this.onlineCounts.has(userId);
      this.onlineCounts.set(userId, (this.onlineCounts.get(userId) ?? 0) + 1);
      if (wasOffline) {
        this.server.emit('presence:update', { userId, online: true });
      }
    } catch {
      this.logger.debug(`Rejected socket connection: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as AuthedSocket).data.userId;
    if (!userId) return;
    const remaining = (this.onlineCounts.get(userId) ?? 1) - 1;
    if (remaining <= 0) {
      this.onlineCounts.delete(userId);
      this.server.emit('presence:update', { userId, online: false });
    } else {
      this.onlineCounts.set(userId, remaining);
    }
  }

  isOnline(userId: string): boolean {
    return this.onlineCounts.has(userId);
  }

  // Goi tu NotificationService.create() ngay sau khi tao xong 1 thong bao -
  // best-effort, KHONG throw (server co the khong co client nao dang online
  // cho user do, Socket.IO tu bo qua neu room rong, khong loi gi ca).
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
