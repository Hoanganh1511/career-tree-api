import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, MessageType } from '../../generated/prisma/client';
import { ChatService, messageInclude } from './chat.service';
import { SearchMessagesQueryDto } from './dto/search-messages-query.dto';

// Marker khong-in-duoc (KHONG phai the HTML) de danh dau phan khop trong
// snippet cua ts_headline() - de FE tu tach chuoi + dung <mark> REACT (khong
// phai dangerouslySetInnerHTML) khi render, tranh XSS neu noi dung tin nhan
// vo tinh/co y chua san 1 chuoi giong the HTML gia. Xem
// docs/chat-search-architecture.md muc "Snippet & XSS".
const HL_START = '\u0001';
const HL_STOP = '\u0002';
const HEADLINE_OPTIONS = `StartSel=${HL_START}, StopSel=${HL_STOP}, MaxFragments=1, MaxWords=30, MinWords=12, ShortWord=3`;

type SearchCursor = { id: string; rank?: number };

function encodeCursor(c: SearchCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): SearchCursor | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    );
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { id?: unknown }).id === 'string'
    ) {
      const { id, rank } = parsed as { id: string; rank?: unknown };
      return { id, rank: typeof rank === 'number' ? rank : undefined };
    }
    return null;
  } catch {
    return null;
  }
}

type SearchRow = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMimeType: string | null;
  createdAt: Date;
  rank: number;
  snippet: string;
};

// Full-text search tren Message.content qua cot GENERATED "searchVector"
// (xem migration message_search_vector + docs/chat-search-architecture.md).
// Tach rieng khoi ChatService (da rat lon) - chi tai dung messageInclude/
// toMessageApi cua ChatService cho endpoint "context quanh 1 tin nhan" (can
// tra ve DUNG shape ApiChatMessage day du de FE render thang vao khung chat).
@Injectable()
export class ChatSearchService {
  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  // Tim tin nhan theo tu khoa - mac dinh tren TOAN BO hoi thoai nguoi dung
  // dang tham gia (dto.conversationId de gioi han ve 1 hoi thoai cu the, vd
  // popup search trong 1 doan chat dang mo). QUYEN TRUY CAP luon duoc loc
  // O TANG QUERY SQL (subquery ConversationParticipant), KHONG dua vao
  // dto.conversationId hop le hay khong - dam bao khong lo du lieu qua 1
  // conversationId nguoi dung tu truyen len ma ho khong phai thanh vien.
  async search(userId: string, dto: SearchMessagesQueryDto) {
    const limit = dto.limit ?? 20;
    const sort = dto.sort ?? 'relevance';
    const cursor = dto.cursor ? decodeCursor(dto.cursor) : null;

    const conditions: Prisma.Sql[] = [
      Prisma.sql`m."searchVector" @@ query.tsq`,
      // Recall da xoa sach content (xem ChatService.recallMessage) nen
      // searchVector cua tin bi thu hoi tu dong rong - dieu kien nay chi de
      // phong thu them/lam ro y dinh, khong phai dieu kien "chinh".
      Prisma.sql`m."isRecalled" = false`,
      Prisma.sql`m."conversationId" IN (
        SELECT cp."conversationId" FROM "ConversationParticipant" cp
        WHERE cp."userId" = ${userId}
      )`,
    ];

    if (dto.conversationId) {
      conditions.push(Prisma.sql`m."conversationId" = ${dto.conversationId}`);
    }
    if (dto.senderId) {
      conditions.push(Prisma.sql`m."senderId" = ${dto.senderId}`);
    }
    if (dto.type) {
      conditions.push(Prisma.sql`m."type" = ${dto.type}::"MessageType"`);
    }
    if (dto.from) {
      conditions.push(Prisma.sql`m."createdAt" >= ${new Date(dto.from)}`);
    }
    if (dto.to) {
      conditions.push(Prisma.sql`m."createdAt" <= ${new Date(dto.to)}`);
    }

    // "total" (tong so ket qua khop, KHONG phu thuoc trang hien tai) chi tinh
    // o TRANG DAU (khong co cursor) - FE cache lai gia tri nay cho ca phien
    // tim kiem, khong tinh lai moi lan "xem them" (tranh 1 query COUNT thua
    // moi trang). Dieu kien tinh total la BASE (chua gan cursor).
    const baseConditions = [...conditions];

    let orderBy: Prisma.Sql;
    if (sort === 'recent') {
      orderBy = Prisma.sql`ORDER BY m."id" DESC`;
      if (cursor) conditions.push(Prisma.sql`m."id" < ${cursor.id}`);
    } else {
      // Keyset tren (rank, id) - rank khong unique nen can id lam tie-
      // breaker de phan trang on dinh (giong ly do dung id lam cursor o
      // listMessages, xem chat.service.ts).
      orderBy = Prisma.sql`ORDER BY rank DESC, m."id" DESC`;
      if (cursor && typeof cursor.rank === 'number') {
        conditions.push(
          Prisma.sql`(rank, m."id") < (${cursor.rank}, ${cursor.id})`,
        );
      }
    }

    const where = Prisma.join(conditions, ' AND ');

    // CTE "query" tinh websearch_to_tsquery 1 LAN (khong phai lai moi dong) -
    // unaccent() ap dung cho CA input nguoi dung, khop voi cach searchVector
    // duoc sinh (xem migration) de tim co dau/khong dau deu ra ket qua.
    const [rows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<SearchRow[]>`
        WITH query AS (
          SELECT websearch_to_tsquery('simple', immutable_unaccent(${dto.q})) AS tsq
        )
        SELECT
          m.id,
          m."conversationId",
          m."senderId",
          m.type,
          m.content,
          m."attachmentUrl",
          m."attachmentName",
          m."attachmentMimeType",
          m."createdAt",
          ts_rank_cd(m."searchVector", query.tsq) AS rank,
          ts_headline(
            'simple',
            coalesce(m.content, ''),
            query.tsq,
            ${HEADLINE_OPTIONS}
          ) AS snippet
        FROM "Message" m, query
        WHERE ${where}
        ${orderBy}
        LIMIT ${limit + 1}
      `,
      cursor
        ? Promise.resolve(null)
        : this.prisma.$queryRaw<{ count: bigint }[]>`
            WITH query AS (
              SELECT websearch_to_tsquery('simple', immutable_unaccent(${dto.q})) AS tsq
            )
            SELECT count(*)::bigint AS count
            FROM "Message" m, query
            WHERE ${Prisma.join(baseConditions, ' AND ')}
          `,
    ]);
    const total = totalRows ? Number(totalRows[0]?.count ?? 0) : undefined;

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return {
      items: page.map((r) => ({
        id: r.id,
        conversationId: r.conversationId,
        senderId: r.senderId,
        type: r.type,
        attachmentName: r.attachmentName,
        attachmentMimeType: r.attachmentMimeType,
        attachmentUrl: r.attachmentUrl,
        // \u0001/\u0002 danh dau vi tri khop - FE tu split + boc <mark>.
        snippet: r.snippet,
        rank: Number(r.rank),
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor:
        hasMore && last
          ? encodeCursor({
              id: last.id,
              rank: sort === 'relevance' ? Number(last.rank) : undefined,
            })
          : null,
      // Chi co gia tri o trang dau (khong cursor) - xem comment tren total.
      total,
    };
  }

  // "Nhay toi" 1 ket qua tim kiem: tra ve N tin nhan truoc/sau messageId (theo
  // id - cung thu tu voi cursor pagination cua listMessages) de FE dung lam
  // "cua so" ban dau quanh diem nhay, thay vi phai load lai tu dau hoi thoai.
  // Tra ve DUNG shape ApiChatMessage (tai dung ChatService.toMessageApi) de
  // FE ghep thang vao `messages` hien co, dung chung MessageBubble.
  async getMessageContext(
    userId: string,
    conversationId: string,
    messageId: string,
    before: number,
    after: number,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const target = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: messageInclude,
    });
    if (!target || target.conversationId !== conversationId) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }

    // Over-fetch +1 moi phia de biet hasMoreBefore/hasMoreAfter (cung pattern
    // voi listMessages) - FE dung 2 co nay de biet co the tiep tuc "tai them"
    // theo huong tuong ung tu diem nhay hay khong.
    const [beforeRows, afterRows] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, id: { lt: messageId } },
        orderBy: { id: 'desc' },
        take: before + 1,
        include: messageInclude,
      }),
      this.prisma.message.findMany({
        where: { conversationId, id: { gt: messageId } },
        orderBy: { id: 'asc' },
        take: after + 1,
        include: messageInclude,
      }),
    ]);

    const hasMoreBefore = beforeRows.length > before;
    const hasMoreAfter = afterRows.length > after;
    const beforePage = (
      hasMoreBefore ? beforeRows.slice(0, before) : beforeRows
    ).reverse();
    const afterPage = hasMoreAfter ? afterRows.slice(0, after) : afterRows;

    return {
      items: [...beforePage, target, ...afterPage].map((m) =>
        this.chatService.toMessageApi(m, userId),
      ),
      hasMoreBefore,
      hasMoreAfter,
    };
  }
}
