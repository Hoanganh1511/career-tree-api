import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
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
const allowedOrigins = (
  process.env.FRONTEND_URL ?? 'http://localhost:3000'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Day thong bao real-time toi dung 1 user - moi client join 1 "room" rieng
// theo userId (`user:${id}`) sau khi xac thuc, KHONG broadcast toan cuc.
// Xac thuc bang CUNG co che JwtAuthGuard dung cho HTTP (cung INTERNAL_API_SECRET,
// cung TOKEN_ISSUER) nhung audience rieng (AUDIENCE_SOCKET, xem token-audience.ts)
// - token nay do FE tu ky (signSocketToken) va gui qua handshake.auth.token
// LUC KET NOI, khac han apiFetch (ky lai token moi cho MOI request).
@Injectable()
@WebSocketGateway({ cors: { origin: allowedOrigins, credentials: true } })
export class NotificationGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private jwt: JwtService) {}

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
      await client.join(`user:${payload.sub}`);
    } catch {
      this.logger.debug(`Rejected socket connection: invalid token`);
      client.disconnect();
    }
  }

  // Goi tu NotificationService.create() ngay sau khi tao xong 1 thong bao -
  // best-effort, KHONG throw (server co the khong co client nao dang online
  // cho user do, Socket.IO tu bo qua neu room rong, khong loi gi ca).
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
