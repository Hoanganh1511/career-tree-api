# Kiến trúc Tìm kiếm tin nhắn (Full-text Search) — hiện trạng

Tài liệu ghi **hiện trạng kiến trúc** tính năng tìm kiếm tin nhắn chat, xây
bằng PostgreSQL full-text search (hướng A — không dùng search engine riêng
như Elasticsearch/Meilisearch). Đọc file này để biết tính năng đang chạy thế
nào, vì sao chọn hướng này, và khi nào cần đổi hướng — không cần đọc lại lịch
sử chat.

---

## 1. Một câu tóm tắt

> `Message.content` được PostgreSQL tự sinh ra 1 cột `tsvector` (generated
> column, không trigger), chuẩn hoá qua `unaccent` + config `simple` để tìm
> có dấu/không dấu đều ra kết quả — quyền truy cập lọc **trong** câu SQL
> (subquery `ConversationParticipant`), không lọc ở tầng application.

```
Message.content ──(GENERATED ALWAYS)──> searchVector (tsvector, GIN index)
                                              │
ChatSearchService.search() ──websearch_to_tsquery + ts_rank_cd + ts_headline──> kết quả xếp hạng + snippet
                                              │
                                    lọc quyền truy cập NGAY trong WHERE (subquery ConversationParticipant)
```

---

## 2. Storage & indexing

### 2.1. Generated column, không trigger

`prisma/migrations/20260821165505_message_search_vector/migration.sql`:

```sql
ALTER TABLE "Message" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', immutable_unaccent(coalesce("content", '')))
  ) STORED;

CREATE INDEX "Message_searchVector_idx" ON "Message" USING GIN ("searchVector");
```

Chọn **generated column** thay vì trigger `BEFORE INSERT/UPDATE`, vì:
- Không thể quên cập nhật `searchVector` khi sửa `content` ở bất kỳ code path
  nào trong tương lai (kể cả seed script, migration data-fix, v.v.) — Postgres
  tự tính lại, không phụ thuộc application code.
- Không cần trigger function riêng, ít rủi ro lệch dữ liệu nhất trong 2
  lựa chọn mà brief đề ra.
- Hệ quả phụ có lợi: `ChatService.recallMessage()` đã xoá sạch `content` về
  `null` khi thu hồi tin nhắn (không phải thay đổi gì thêm) → `searchVector`
  tự động rỗng → tin nhắn bị thu hồi **tự động biến mất khỏi kết quả tìm
  kiếm** mà không cần thêm logic riêng. Điều kiện `isRecalled = false` trong
  query vẫn được giữ lại cho rõ ý định, nhưng về mặt kỹ thuật là dư thừa.

### 2.2. Vì sao "simple" + unaccent, không phải "english" hay dictionary tiếng Việt

Nội dung chat chủ yếu là tiếng Việt. Postgres không có dictionary tiếng Việt
built-in tốt (không stemming đúng, không tách từ ghép). 3 lựa chọn đã cân
nhắc:

| Hướng | Ưu | Nhược | Quyết định |
|---|---|---|---|
| Config `english` | Có sẵn, stemming tốt cho tiếng Anh | Sai ngữ cảnh — nội dung không phải tiếng Anh | Không dùng |
| Extension bên thứ 3 (vd tách từ tiếng Việt) | Tách từ/stemming đúng hơn | Thêm rủi ro hạ tầng (extension không chuẩn, có thể không cài được trên Neon managed Postgres), phức tạp vượt quá nhu cầu MVP | Không dùng ở pass này |
| **`simple` + `unaccent`** | Có sẵn (extension contrib chuẩn), ổn định, đủ tốt cho tìm từ khoá ngắn trong tin nhắn chat | Không stemming (tìm "chạy" không ra "chạy bộ" qua biến thể ngữ pháp — nhưng tiếng Việt không chia động từ nên ảnh hưởng này nhỏ hơn tiếng Anh) | **Đã chọn** |

`simple` chỉ tokenize + lowercase, không stemming — với tiếng Việt (không
chia động từ theo thì/ngôi như tiếng Anh) việc thiếu stemming ít ảnh hưởng
hơn. Bù lại, **tìm không dấu ra kết quả có dấu** (và ngược lại) là yêu cầu
UX phổ biến hơn nhiều với người dùng Việt Nam, nên được ưu tiên giải quyết
bằng `unaccent`.

**`unaccent()` built-in không dùng trực tiếp được** trong generated column vì
nó được đánh dấu `STABLE` (phụ thuộc `search_path` tra dictionary theo tên),
trong khi Postgres bắt buộc biểu thức generated column phải `IMMUTABLE`. Giải
pháp chuẩn (khá phổ biến, không phải hack riêng của dự án này) là bọc lại 1
hàm SQL gọi thẳng dictionary `unaccent` cố định và khai báo `IMMUTABLE`:

```sql
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$ SELECT unaccent('unaccent', $1) $$
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;
```

Hàm này được dùng ở **cả 2 phía** — sinh `searchVector` (lúc ghi) **và**
chuẩn hoá từ khoá tìm kiếm (lúc đọc, xem mục 3) — để đảm bảo cùng 1 phép biến
đổi được áp dụng nhất quán hai chiều.

### 2.3. Index

Chỉ 1 GIN index riêng trên `searchVector`, **không** gộp `conversationId`
vào cùng 1 GIN index (điều đó cần extension `btree_gin` để có opclass GIN
cho cột scalar như `conversationId`). Khi lọc theo cả `conversationId` lẫn
`searchVector`, planner tự kết hợp GIN index này với btree index sẵn có
(`@@index([conversationId, createdAt])`) qua Bitmap Index Scan + BitmapAnd —
đủ tốt ở quy mô hiện tại. Cân nhắc `btree_gin` composite index là 1 trong các
mốc "cần nghĩ lại" ở mục 6.

Đã verify trực tiếp trên DB: cột đúng là `GENERATED ALWAYS`, biểu thức đúng
như migration, index tồn tại đúng kiểu `gin`, và `immutable_unaccent()` chạy
đúng (`'Đây là tiếng Việt có dấu'` → `'Day la tieng Viet co dau'`).

---

## 3. Query & ranking (`ChatSearchService`, `src/chat/chat-search.service.ts`)

### 3.1. Query cơ bản

```sql
WITH query AS (
  SELECT websearch_to_tsquery('simple', immutable_unaccent($keyword)) AS tsq
)
SELECT ..., ts_rank_cd(m."searchVector", query.tsq) AS rank,
       ts_headline('simple', coalesce(m.content, ''), query.tsq, $headlineOpts) AS snippet
FROM "Message" m, query
WHERE m."searchVector" @@ query.tsq
  AND m."isRecalled" = false
  AND m."conversationId" IN (SELECT "conversationId" FROM "ConversationParticipant" WHERE "userId" = $userId)
  -- + filter tuỳ chọn: conversationId, senderId, type, from/to
ORDER BY rank DESC, m."id" DESC   -- hoặc ORDER BY m."id" DESC nếu sort=recent
LIMIT $limit + 1
```

- **`websearch_to_tsquery`** (không phải `plainto_tsquery`/`to_tsquery`) vì
  cho phép người dùng gõ tự nhiên: cụm từ trong `"..."`, loại trừ bằng `-từ`,
  `OR` — đúng khuyến nghị trong brief.
- **`ts_rank_cd`** (không phải `ts_rank`) vì đánh giá thêm mật độ từ khoá gần
  nhau (cover density) — phù hợp hơn `ts_rank` cho câu tìm nhiều từ.
- **CTE `query`** tính `websearch_to_tsquery` đúng 1 lần (không phải lại mỗi
  dòng) — cross join thường (không cần `LATERAL` vì `query` không phụ thuộc
  cột nào của `m`).

### 3.2. Quyền truy cập lọc TRONG câu SQL, không lọc ở application

Điều kiện `m."conversationId" IN (SELECT ... WHERE "userId" = $userId)` LUÔN
được áp dụng, bất kể client có truyền `conversationId` hay không, và bất kể
`conversationId` đó có hợp lệ hay không. Nếu áp dụng sai cách (fetch trước rồi
lọc ở TypeScript), một lỗi logic ở tầng application có thể vô tình lộ nội
dung tin nhắn của hội thoại người dùng không tham gia — đặt điều kiện này
ngay trong `WHERE` loại bỏ hoàn toàn lớp rủi ro đó (database tự đảm bảo).

### 3.3. Sort & phân trang (cursor)

2 chế độ sort, `relevance`/`recent`:

| Sort | ORDER BY | Cursor keyset |
|---|---|---|
| `relevance` (mặc định) | `rank DESC, id DESC` | `(rank, id) < (cursorRank, cursorId)` — `id` làm tie-breaker vì `rank` không unique |
| `recent` | `id DESC` | `id < cursorId` — cùng pattern với `listMessages()` (load-more lịch sử chat) |

Cursor là 1 chuỗi base64url mã hoá `{ id, rank? }` (`encodeCursor`/
`decodeCursor` trong `chat-search.service.ts`) — cùng triết lý "opaque cursor"
với `nextCursor` của tính năng load-more đã có, nhưng cần thêm `rank` vì sort
mặc định là 2 khoá (`rank`, `id`) chứ không phải 1 khoá như phân trang lịch
sử chat thông thường.

### 3.4. Snippet & XSS

`ts_headline` trả về đoạn trích với phần khớp được bọc bởi 2 ký tự điều khiển
không in được (`U+0001`/`U+0002`), **không phải** thẻ `<mark>` HTML thật. Lý
do: nội dung tin nhắn do người dùng nhập — nếu server trả thẳng
`<mark>...</mark>` ghép vào giữa content gốc, và FE lỡ dùng
`dangerouslySetInnerHTML` để hiện `<mark>`, một tin nhắn có nội dung như
`<img src=x onerror=...>` sẽ thực thi được. Trả marker vô hại (không phải cú
pháp HTML) buộc FE phải tự tách chuỗi (`split` theo 2 ký tự này) và dựng
`<mark>` bằng React element thật — không có đường nào dẫn tới
`dangerouslySetInnerHTML`.

### 3.5. Endpoint "context quanh 1 tin nhắn"

`getMessageContext(userId, conversationId, messageId, before, after)` —
dùng khi người dùng bấm vào 1 kết quả tìm kiếm để "nhảy tới" tin nhắn đó
trong khung chat, có thể nằm ngoài trang `messages` hiện đang tải. Query
2 lượt (song song) theo `id` — cùng hướng `lt`/`gt` với cursor pagination của
`listMessages()` — over-fetch +1 mỗi phía để biết `hasMoreBefore`/
`hasMoreAfter`, tái dùng **nguyên `messageInclude` + `toMessageApi()`** của
`ChatService` (export riêng cho mục đích này) để trả về đúng shape
`ApiChatMessage` đầy đủ (poll/reactions/replyTo) — không phải 1 shape rút gọn
riêng cho tính năng search.

---

## 4. API contract

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/conversations/messages/search` | Full-text search — toàn bộ hội thoại đang tham gia, hoặc 1 hội thoại nếu truyền `conversationId`. Query: `q, conversationId?, senderId?, type?, from?, to?, sort?, cursor?, limit?`. Dùng cho cả popup search trong 1 hội thoại lẫn drawer "Xem tất cả kết quả" — xem mục 7 (bản cập nhật). |
| `GET` | `/conversations/:id/messages/:messageId/context` | Context quanh 1 tin nhắn — query: `before?, after?` (mặc định 15, tối đa 50). |

Response `GET /conversations/messages/search`:

```ts
{
  items: Array<{
    id: string; conversationId: string; senderId: string;
    type: "TEXT" | "IMAGE" | "FILE" | "VOICE" | "GIF" | "POLL";
    attachmentName: string | null; attachmentMimeType: string | null; attachmentUrl: string | null;
    snippet: string;   // chứa marker U+0001/U+0002, xem 3.4
    rank: number;
    createdAt: string; // ISO
  }>;
  nextCursor: string | null;
  // Tong so ket qua khop - CHI co gia tri o trang dau (khong truyen cursor),
  // tinh bang 1 query COUNT(*) rieng chay SONG SONG voi query lay du lieu
  // (cung dieu kien WHERE, tru cursor) - xem 3.3 (ban cap nhat).
  total?: number;
}
```

Response `GET /conversations/:id/messages/:messageId/context`:

```ts
{
  items: ApiChatMessage[];  // before...target...after, cùng shape với listMessages()
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
}
```

Contract này được thiết kế để **giữ nguyên hình dạng** dù sau này đổi sang
search engine riêng (Elasticsearch/Meilisearch/...) — chỉ thay phần triển
khai bên trong `ChatSearchService`, phía FE không cần đổi.

---

## 5. Kiến trúc Frontend

> **[Cập nhật]** Mục 5.1 ban đầu viết dưới dạng mô tả (chưa code). Lần sửa kế
> tiếp đã hiện thực hoá **1 phần**: `MessageSearchPopover.tsx` (redesign, hiện
> 3 kết quả gần nhất + snippet highlight) và `MessageSearchDrawer.tsx` (mới,
> drawer trượt từ phải, phân trang 10/lần) — không dùng 1 hook chung
> `useMessageSearch` như mô tả gốc (2 component có nhu cầu debounce/phân
> trang đủ khác nhau nên viết logic fetch riêng, ngắn, dễ đọc hơn là 1 hook
> dùng chung sớm). **Mục 5.2 (bấm kết quả → nhảy tới tin nhắn) và 5.3 (tải
> tin mới hơn) VẪN CHƯA làm** — kết quả trong popover/drawer hiện chỉ hiển
> thị, chưa bấm được để nhảy vào đúng vị trí trong khung chat.

### 5.1. Hook `useMessageSearch` (mô tả gốc — xem ghi chú cập nhật ở trên)

State: `{ q, filters: {conversationId?, senderId?, type?, from?, to?}, sort, items, nextCursor, loading, error }`.

- Debounce 350ms trên `q` — cùng thời gian debounce với
  `MessageSearchPopover.tsx` hiện có, giữ cảm giác nhất quán.
- Đổi `filters`/`sort` reset `items`/`nextCursor` và fetch lại từ đầu (không
  cursor) — cùng nguyên tắc với việc đổi `activeId` reset `messages` trong
  `MessagesShell.tsx`.
- `loadMore()` gọi lại với `cursor = nextCursor` hiện tại, **nối thêm** vào
  `items` (không thay thế) — tái dùng đúng pattern cursor-based đã thống nhất
  ở tính năng load-more lịch sử chat (`handleLoadOlder` trong
  `MessagesShell.tsx`).
- Snippet: component render tự `split(snippet, ['U+0001', 'U+0002'])` thành
  mảng đoạn, đoạn ở giữa 2 marker bọc trong `<mark>` — không dùng
  `dangerouslySetInnerHTML` (xem 3.4).

### 5.2. Luồng "bấm vào kết quả → nhảy tới tin nhắn"

1. Nếu `result.conversationId !== activeId`: gọi `setActiveId(result.conversationId)`
   trước (hàm này đã tồn tại, tự reset `messages`/`nextCursor`/draft... đồng
   bộ — xem `MessagesShell.tsx`).
2. Gọi `getMessageContextAction(conversationId, messageId)`.
3. **Thay hẳn** `messages` bằng `response.items` (không nối vào state cũ —
   cửa sổ context là 1 điểm neo mới, không chắc liền mạch với bất kỳ trang
   nào đã tải trước đó).
4. Set `nextCursor` = id của tin nhắn **đầu tiên** trong `response.items` nếu
   `hasMoreBefore` — để nút/sentinel "tải thêm lịch sử cũ" (đã có, xem
   `handleLoadOlder`) tiếp tục hoạt động đúng từ điểm neo mới, không cần biết
   gì khác biệt.
5. Sau khi `messages` đã render (DOM có node `msg-<id>`), gọi lại đúng
   `handleJumpToMessage(messageId)` đã có sẵn (`scrollIntoView` + highlight
   tạm thời) — nhưng **phải đợi 1 nhịp sau khi DOM commit** (khác với chỗ
   dùng hiện tại của hàm này cho reply-preview, nơi tin nhắn gốc ĐÃ có sẵn
   trong DOM từ trước) — dùng `useEffect`/`useLayoutEffect` khoá theo 1 ref
   "đang chờ nhảy tới id X" thay vì gọi ngay sau `setMessages`.

### 5.3. Khoảng trống kiến trúc cần lưu ý: "tải tin mới hơn" (load-newer)

Đây là điểm **chưa có sẵn** trong `MessagesShell.tsx` hiện tại và **bắt buộc
phải xây thêm** để tính năng "nhảy tới kết quả search" hoàn chỉnh:

- Hiện tại `MessagesShell.tsx` chỉ có 2 nguồn cập nhật `messages` về phía
  MỚI hơn: (a) tải trang đầu tiên (luôn là các tin **mới nhất**), và (b) tin
  nhắn realtime qua socket (luôn **nối vào đuôi** state hiện có, giả định
  người dùng đang ở đúng đầu mút "live" của hội thoại).
- Khi nhảy tới 1 tin nhắn CŨ nằm sâu trong lịch sử (qua kết quả search),
  `hasMoreAfter = true` nghĩa là còn tin MỚI HƠN giữa điểm neo và đầu mút
  live — mà **không có** cơ chế tải xuôi (scroll-down) nào để lấy chúng.
  Realtime append không giải quyết được vì nó chỉ nối tin phát sinh SAU khi
  socket đang lắng nghe, không lấp được khoảng trống lịch sử ở giữa.
- Đề xuất: 1 sentinel `IntersectionObserver` **thứ hai**, đặt ở **cuối**
  danh sách (đối xứng với sentinel "tải tin cũ hơn" đã có ở đầu, xem
  `loadOlderSentinelRef`) — chỉ mount khi đang ở chế độ "context/nhảy tới"
  (không mount trong luồng xem hội thoại bình thường, tránh xung đột với
  auto-scroll-xuống-đáy hiện có). Khi sentinel này chạm đáy màn hình, gọi
  `listMessagesAction`-kiểu-xuôi (cần thêm tham số `direction: "after"` hoặc
  1 action riêng dùng lại `getMessageContextAction` với id cuối cùng đang có
  làm mốc). Khi `hasMoreAfter` trả về `false`, coi như đã "đuổi kịp" đầu mút
  live — gỡ sentinel này, chuyển hẳn sang hành vi realtime-append/auto-scroll
  bình thường như các cuộc hội thoại khác.
- Việc này **không nằm trong phạm vi đã triển khai ở pass này** (BE endpoint
  context đã có, đủ dữ liệu để FE xây phần trên) — cố tình để lại thành 1
  việc rõ ràng, không lặng lẽ bỏ qua.

---

## 6. Giới hạn của hướng A & khi nào cần nghĩ lại

Ghi lại rõ ràng để không phải đoán lại từ đầu khi vấn đề thực sự xảy ra:

- **Hiệu năng ghi giảm dần / độ trễ query tăng** khi tổng số tin nhắn lớn —
  GIN index có chi phí ghi cao hơn btree, và `ORDER BY rank` không dùng được
  index (phải sort tập kết quả đã khớp `@@` trong bộ nhớ). Ở quy mô hiện tại
  (vài chục nghìn tin) không đáng lo; nếu độ trễ p95 của
  `/conversations/messages/search` vượt ngưỡng chấp nhận được, cân nhắc:
  composite GIN index (`btree_gin`, xem 2.3), hoặc materialize kết quả
  rank phổ biến, trước khi nhảy thẳng sang search engine riêng.
- **Fuzzy search / typo-tolerance mạnh** — Postgres FTS không tha lỗi chính
  tả tốt (`pg_trgm` có thể bù 1 phần cho tìm gần đúng theo ký tự, nhưng khác
  bản chất so với FTS theo từ). Nếu đây trở thành yêu cầu thật, đó là dấu
  hiệu rõ ràng cần Elasticsearch/Meilisearch/Typesense.
- **Autocomplete tức thời trên tập dữ liệu lớn** — FTS không được thiết kế
  cho use-case gõ-tới-đâu-gợi-ý-tới-đó với độ trễ ~ms trên dữ liệu lớn; cần
  index/engine chuyên biệt (trie, edge n-gram) nếu yêu cầu này xuất hiện.
- **Tách từ tiếng Việt sâu hơn** (từ ghép, ngữ nghĩa) — `simple` + `unaccent`
  chỉ tokenize/lowercase/bỏ dấu, không hiểu ranh giới từ ghép tiếng Việt
  ("học sinh" bị tách thành 2 token độc lập). Nếu chất lượng kết quả trở
  thành vấn đề thực tế (không phải giả định), cân nhắc dictionary/extension
  tiếng Việt chuyên dụng.
- **Search đa loại dữ liệu cùng lúc** (file, tên hội thoại, v.v.) với 1 hệ
  ranking thống nhất — Postgres FTS làm được nhưng sẽ cần hợp nhất
  `tsvector` từ nhiều bảng (union query hoặc 1 bảng tổng hợp riêng); tới lúc
  đó nên đánh giá lại xem có đáng chuyển hẳn sang search engine riêng (vốn
  giải bài toán multi-index/multi-source tốt hơn) thay vì tiếp tục mở rộng
  Postgres FTS.

**Nguyên tắc khi migrate**: contract API ở mục 4 giữ nguyên hình dạng —
`ChatSearchService` là ranh giới duy nhất cần thay khi đổi search engine,
route/DTO/response shape phía NestJS controller và toàn bộ phía FE không đổi.

---

## 7. Quyết định phạm vi đã đưa ra trong lần triển khai này

- **[Cập nhật]** `/conversations/:id/messages/search` (quick-search ILIKE cũ)
  ban đầu được giữ nguyên song song (xem lý do gạch dưới), nhưng ngay lần sửa
  kế tiếp — khi `MessageSearchPopover.tsx` được redesign để dùng
  rank/snippet/highlight/"xem tất cả kết quả" (drawer riêng, phân trang 10/
  lần) — route này đã **bị xoá hẳn** (cùng `ChatService.searchMessages()` và
  action/client fn phía FE), vì lúc đó không còn nơi nào gọi tới nữa (đã
  verify bằng grep trước khi xoá). `/conversations/messages/search` (endpoint
  mới) giờ là **con đường tìm kiếm tin nhắn duy nhất**, dùng chung cho cả
  popup trong 1 hội thoại (`conversationId` cố định, `sort=recent`,
  `limit=3`) lẫn drawer "Xem tất cả kết quả" (cùng tham số, `limit=10` +
  cursor phân trang).
- Quyết định gốc (giữ nguyên song song, không gộp ngay) vẫn đúng ở thời điểm
  viết — chỉ là scope ban đầu, không phải sai lầm cần sửa; ghi lại ở đây để
  không ai ngạc nhiên khi thấy 2 lần quyết định khác nhau trong lịch sử file
  này.
- **Không dùng preview feature `postgresqlExtensions`** của Prisma để khai
  báo `unaccent` trong `schema.prisma` — viết thẳng `CREATE EXTENSION IF NOT
  EXISTS unaccent;` trong migration SQL. Đơn giản hơn, không phụ thuộc 1
  preview feature, tránh Prisma tự quản lý (và có thể diff nhầm) 1 extension
  ở những lần `migrate dev` sau.
- **Không xây rate-limit riêng** cho endpoint search (validate `limit` tối
  đa 50 qua DTO là đủ ở quy mô hiện tại) — nhất quán với quyết định tương tự
  đã áp dụng cho `listMessages()` (xem `MAX_MESSAGES_PAGE_SIZE`).
