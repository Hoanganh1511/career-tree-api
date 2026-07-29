# Kiến trúc Auth — hiện trạng

Tài liệu ghi **hiện trạng kiến trúc xác thực** của career-tree (backend
`career-tree-api` + frontend `enggo`). Đọc file này để biết auth đang chạy thế
nào mà không phải đọc lại lịch sử chat.

Liên quan: [`user-schema-design.md`](./user-schema-design.md) — thiết kế schema
user đầy đủ và lộ trình mở rộng.

---

## 1. Một câu tóm tắt

> Next.js là **auth server**, NestJS là **internal service** đứng sau nó.
> Trình duyệt không bao giờ chạm vào token gọi API.

```
Browser ──cookie JWE (HttpOnly)──> Next.js ──Bearer JWT nội bộ (60s)──> NestJS ──> Postgres
                                      │
                                      └──OIDC──> Google
```

## 2. Kiến trúc này dựa trên 2 chuẩn, ở 2 tầng khác nhau

Đây **không phải** hai lựa chọn thay thế nhau — chúng chồng lên nhau:

| Tầng | Chuẩn | Trả lời câu hỏi |
|---|---|---|
| Đăng nhập | **OIDC** (OpenID Connect) | Người này là ai? |
| Giữ session | **BFF** (Backend For Frontend, OWASP khuyến nghị) | Ai giữ token sau khi đăng nhập? |
| Gọi service nội bộ | **Trusted Subsystem** | Backend tin ai? |

### 2.1. Tầng OIDC — đúng chuẩn

Auth.js khai báo Google là OIDC provider chứ không phải OAuth thuần:

```js
// @auth/core/providers/google.js:112
type: "oidc",
issuer: "https://accounts.google.com",
```

Và định danh lấy từ **ID token đã được verify**, không phải access token:

```js
// @auth/core/lib/actions/callback/oauth/callback.js:168
const idTokenClaims = o.getValidatedIdTokenClaims(processedCodeResponse);
profile = idTokenClaims;
```

Nên `profile.sub` trong `enggo/src/auth.ts` là claim `sub` của ID token — đã
verify chữ ký qua JWKS của Google, cùng `iss`/`aud`/`exp`/`nonce`.

**Không lưu access/refresh token của Google ở bất kỳ đâu.** Callback `jwt` nhận
`account` nhưng chỉ dùng làm điều kiện `if`, không đụng `account.access_token`.
Không lưu = không thể rò.

### 2.2. Tầng BFF — đạt mục tiêu chính, lệch 1 chỗ có ý thức

| Nguyên tắc BFF | Trạng thái |
|---|---|
| Browser không giữ token gọi API | ✅ |
| Cookie `HttpOnly` + `Secure` + `SameSite` | ✅ mặc định Auth.js, prefix `__Secure-` ở production |
| Không có token trong `localStorage` | ✅ |
| Token sống ngắn | ✅ 60s |
| Session lưu server-side, cookie là ID mờ | ❌ dùng `strategy: "jwt"` — cookie tự nó là JWE chứa state |

Hệ quả của chỗ lệch: **không revoke được từng session riêng lẻ** (xem mục 5).

> `SameSite=Lax` (không phải `Strict`) là **cố ý** — `Strict` sẽ làm gãy
> redirect callback quay về từ Google. Đừng "sửa" thành Strict.

### 2.3. Tầng Trusted Subsystem — và cái giá của nó

Khác BFF kinh điển (giữ và forward token của IdP), ở đây token Google bị vứt
sau khi đăng nhập, Next.js **tự mint token nội bộ** ký bằng
`INTERNAL_API_SECRET`. NestJS không phải OAuth resource server — nó verify bằng
HMAC đối xứng, không qua JWKS của issuer nào.

**Đánh đổi phải biết:** `INTERNAL_API_SECRET` là **master key**. Ai ký được nó
thì mạo danh được mọi user. Chỉ an toàn với đúng 2 điều kiện:

1. NestJS **không expose ra internet**
2. `userId` truyền vào `signInternalToken()` **luôn từ `auth()`**, không bao giờ
   từ input client

Cả hai hiện đang đúng, nhưng là **giả định ngầm** — không có gì trong code
cưỡng chế. Một chỗ IDOR trong server action = chiếm được mọi tài khoản.

---

## 3. Luồng đăng nhập

1. `/login` → `signInAction()` → `signIn("google", { redirectTo: "/career-tree" })`
2. Google OAuth → callback `/api/auth/[...nextauth]`
3. Auth.js verify ID token → `profile` = claims đã verify
4. Callback `jwt`: gọi `syncUserToBackend({ googleId: profile.sub, email, name })`
   - Mint **sync token** (`aud: career-tree-api/sync`), TTL 60s
   - `POST /users/sync` → `SyncGuard` verify `aud` + `iss` + `purpose`
   - `UserService.syncUser` upsert trong `$transaction`
   - Trả `{ id }` → gán vào `token.userId`
5. Callback `session`: `session.userId = token.userId`
6. Auth.js set cookie JWE, HttpOnly

**Chi tiết đáng chú ý ở bước 4** — backfill legacy chỉ chạy đúng 1 lần, dùng
`updateMany` có điều kiện làm compare-and-swap nguyên tử:

```ts
const claim = await tx.systemFlag.updateMany({
  where: { id: 1, legacyBackfillDone: false },   // ← điều kiện nằm trong WHERE
  data: { legacyBackfillDone: true },
});
if (claim.count === 1) { /* chỉ 1 request duy nhất vào được đây */ }
```

Nếu viết kiểu `findUnique` rồi `if` rồi `update` thì 2 request đồng thời sẽ
cùng lọt.

## 4. Luồng gọi API

1. Server Component / Server Action gọi `apiFetch()`
2. `apiFetch` → `auth()` lấy session → mint **API token** (`sub` = userId,
   `aud: career-tree-api`), TTL 60s
3. `fetch` tới NestJS kèm Bearer, `cache: "no-store"`
4. `JwtAuthGuard` (đăng ký toàn cục qua `APP_GUARD`) verify `aud` + `iss`,
   kiểm `tokensValidAfter`, gán `req.userId`
5. Controller lấy `@CurrentUserId()` — **không bao giờ** đọc userId từ body/query
6. Service gọi `OwnershipService.assertXxxOwner(id, userId)`

**Vì sao 404 chứ không phải 403:** `OwnershipService` ném `NotFoundException`
khi không sở hữu tài nguyên — trả 403 sẽ xác nhận "tài nguyên này có tồn tại,
chỉ là bạn không có quyền", tự nó là rò rỉ thông tin.

## 5. Hai loại token

| | API token | Sync token |
|---|---|---|
| Dùng khi | Mọi request thường | Chỉ lúc đăng nhập |
| `sub` | userId | *(không có)* |
| `aud` | `career-tree-api` | `career-tree-api/sync` |
| `iss` | `enggo-web` | `enggo-web` |
| TTL | 60s | 60s |
| Guard | `JwtAuthGuard` | `SyncGuard` |

Hằng số ở 2 phía phải khớp: `enggo/src/lib/api/sign-internal-token.ts` ↔
`career-tree-api/src/auth/token-audience.ts`.

## 6. "Đăng xuất khỏi mọi thiết bị"

Session của Auth.js là JWT stateless — server không giữ bản ghi nào để xoá. Nên
cách duy nhất thu hồi được mà **không phải đổi cả cơ chế session** là đánh dấu
một mốc thời gian:

- `User.tokensValidAfter` — mọi token có `iat` trước mốc này đều vô hiệu
- `POST /users/me/revoke-sessions` — lấy userId từ token đã verify, không từ body
- `JwtAuthGuard` so `payload.iat` với `tokensValidAfter` mỗi request

Chi phí: 1 lượt đọc theo khoá chính mỗi request — cùng mức với
`OwnershipService` vốn đã làm sẵn.

**Giới hạn:** đây là công tắc *toàn cục* (đăng xuất tất cả), không revoke được
từng thiết bị. Muốn per-device thì phải thêm `jti` + bảng `UserSession` — xem
mục 2.3 trong `user-schema-design.md`.

## 7. Còn lại chưa làm

| Hạng mục | Ghi chú |
|---|---|
| Revoke từng thiết bị | Cần bỏ `strategy: "jwt"` hoặc thêm `jti` + `UserSession` |
| Rotation `INTERNAL_API_SECRET` | Cần hỗ trợ 2 secret song song lúc xoay |
| `LoginEvent` (lịch sử đăng nhập) | Chưa ghi log, chưa có cảnh báo thiết bị lạ |
| Rate limit + `AuditLog` | Chưa có cho các hành động nhạy cảm |
| Multi-provider (`AuthIdentity`) | `googleId` vẫn là cột unique bắt buộc |
