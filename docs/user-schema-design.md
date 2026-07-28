# Thiết kế schema User (social profile)

Thiết kế dữ liệu người dùng đầy đủ cho sản phẩm career-tree khi mở rộng sang
mạng xã hội (feed/post/follow). Tài liệu này ghi **thiết kế đích + lý do chọn**,
chưa phải hiện trạng — hiện trạng xem `prisma/schema.prisma` (model `User` mới
chỉ có 6 field).

Quy ước đặt tên: **camelCase cho field, PascalCase cho model, SCREAMING_SNAKE
cho enum value** — bám theo schema hiện có (`ShareMode.STRUCTURE_ONLY`,
`CardKind.NOTE`), KHÔNG dùng snake_case.

---

## 1. Hiện trạng auth (điểm xuất phát)

| Lớp | Hiện tại |
|---|---|
| Đăng nhập | Auth.js (NextAuth v5) trong `enggo/src/auth.ts`, **chỉ Google provider** |
| Session | `strategy: "jwt"` — cookie stateless, **không có session store** |
| Đồng bộ user | `jwt` callback → `syncUserToBackend({googleId, email, name})` → Nest upsert → trả `user.id` → nhét vào `token.userId` |
| Backend auth | Nest **không tự xác thực người dùng**. `JwtAuthGuard` verify 1 JWT nội bộ HS256 (`INTERNAL_API_SECRET`), TTL 60s, lấy `payload.sub` làm `req.userId` |
| Mint token | `enggo/src/lib/api/sign-internal-token.ts` — `signInternalToken(userId)` và `signSyncToken()` |

Nghĩa là: **Next.js là auth server / BFF, Nest là internal service đứng sau nó.**
Không có password ở bất kỳ đâu.

---

## 2. Sáu xung khắc với checklist & phương án chọn

### 2.1. `passwordHash` / `2faSecret` / `backupCodes` — **KHÔNG thêm**

Checklist giả định first-party password auth. Hệ thống hiện tại uỷ quyền 100%
cho Google.

**Chọn: giữ nguyên OAuth-delegated, không làm password auth.**

Lý do: không có password = không có credential stuffing, không có luồng reset
password (luồng bị tấn công nhiều nhất), không phải tự quản lý 2FA/backup code —
Google đã làm tốt hơn. Mỗi field trong nhóm này là một mặt tấn công mới đổi lấy
giá trị gần bằng 0 khi user vốn đã đăng nhập bằng Google.

Nếu sau này bắt buộc phải có (khách hàng doanh nghiệp, thị trường không dùng
Google): thêm vào bảng `UserCredential` **riêng biệt**, không nhét vào `User`.
Thiết kế bảng ở mục 3 đã chừa sẵn chỗ.

### 2.2. `googleId` là cột bắt buộc — **chuẩn hoá thành bảng `AuthIdentity`**

Hiện tại `User.googleId String @unique` khoá cứng vào đúng 1 provider. Thêm
Apple/GitHub sau này = sửa schema + migration đau.

**Chọn: tách ra `AuthIdentity(provider, providerAccountId)`, unique theo cặp.**

Đổi lại: 1 user có thể link nhiều provider (Google + Apple cùng 1 tài khoản),
và thêm provider mới = thêm 1 row, không đụng schema. Backfill:
`INSERT INTO AuthIdentity SELECT id, 'GOOGLE', googleId FROM User` rồi mới drop
cột `googleId`.

### 2.3. `activeSessions` + revoke từng thiết bị — **bất khả thi với setup hiện tại**

Auth.js `strategy: "jwt"` là stateless: token nằm trong cookie, server không giữ
bản ghi nào, nên **không có cách nào thu hồi 1 session cụ thể**. Đây là xung khắc
thật sự, không phải thiếu field.

**Chọn 2 bước:**

- **Bước 1 (rẻ, làm ngay):** thêm `User.tokensValidAfter DateTime`. Mọi token
  phát hành trước mốc này bị coi là hết hạn → có ngay tính năng "đăng xuất khỏi
  tất cả thiết bị" (đổi mật khẩu Google, nghi ngờ bị hack). Chi phí: 1 cột + 1
  phép so sánh trong `jwt` callback.
- **Bước 2 (khi thật sự cần UI "quản lý thiết bị"):** thêm `jti` (session id)
  vào token Auth.js + bảng `UserSession`; `jwt` callback đối chiếu `jti` với
  bảng mỗi lần refresh. Chưa cần thì đừng làm — nó biến mọi request thành 1 query DB.

Không chọn `strategy: "database"` của Auth.js: enggo không có kết nối DB trực
tiếp (mọi thứ đi qua Nest API), dùng Prisma adapter ở Next.js sẽ tạo đường ghi
DB thứ 2 song song với Nest — hỏng ranh giới kiến trúc hiện tại.

### 2.4. "Mã hoá at-rest cho email" — **xung khắc với `@unique` + lookup**

Không thể vừa mã hoá ngẫu nhiên (AES-GCM có IV riêng mỗi lần) vừa giữ unique
index / tra cứu theo email. Đây là chỗ nhiều thiết kế hứa suông rồi không làm được.

**Chọn theo từng field:**

| Field | Cách làm | Vì sao |
|---|---|---|
| `email` | Plaintext + `@unique`, nhưng **để trong bảng `UserPrivate`** (tách khỏi bảng `User` hot-path), dựa vào mã hoá at-rest ở tầng DB (Neon/RDS) + hạn chế quyền cột | Cần unique + upsert theo email khi sync |
| `phone` | `phoneEnc` (AES-GCM) + `phoneHash` (HMAC-SHA256 với pepper riêng) | Blind index: unique/lookup dùng hash, đọc dùng giải mã |
| `birthdate` | `birthdateEnc` (AES-GCM) + `ageBracket` plaintext (enum) | Gate nội dung theo tuổi chỉ cần bracket, không cần ngày sinh chính xác → giảm hẳn PII phải giải mã |

### 2.5. Trust boundary của `INTERNAL_API_SECRET` — **rủi ro cần ghi rõ**

`signInternalToken(userId)` cho phép **bất kỳ code nào chạy trên Next.js server
mint token cho BẤT KỲ userId nào**. Nest tin tuyệt đối vào `sub`.

Không đổi kiến trúc (BFF pattern là hợp lý ở quy mô này), nhưng bắt buộc:

1. `userId` truyền vào `signInternalToken()` **luôn phải lấy từ `auth()`**, tuyệt
   đối không từ tham số client gửi lên. Một chỗ IDOR trong server action =
   chiếm được mọi tài khoản.
2. Thêm claim `aud` phân biệt rõ 2 loại token (`aud: "api"` vs `aud: "sync"`).
   Hiện `signSyncToken()` không có `sub` nên tình cờ không lọt qua `JwtAuthGuard`,
   nhưng đó là may chứ không phải thiết kế.
3. `INTERNAL_API_SECRET` phải rotate được (hỗ trợ 2 secret song song lúc rotate).

### 2.6. `blockList`/`muteList` dạng array — **dùng bảng join**

Array Postgres không index tốt cho câu hỏi nóng nhất ("A có chặn B không?" —
chạy mỗi lần render post), không mang được `createdAt`, và sửa 1 phần tử phải
ghi lại cả mảng.

**Chọn: `UserBlock` / `UserMute` là bảng riêng**, unique `(blockerId, blockedId)`.

Và theo đúng checklist: **không có** field `blockedByCount` — lộ ra là user tự
suy được mình bị bao nhiêu người chặn.

---

## 3. Sơ đồ tách bảng theo độ nhạy cảm

```
User                  ← public identity, hot path (đọc mỗi lần render post)
├── UserProfile       ← public profile mở rộng (bio, cover, location...)
├── UserPrivate       ← 1-1, PII (email, phone, birthdate)
├── UserSecurity      ← 1-1, recovery + tokensValidAfter
├── UserPrivacy       ← 1-1, toggle riêng tư
├── UserPreference    ← 1-1, theme/lang/notification
├── UserModeration    ← 1-1, CHỈ moderator đọc được
├── UserLegal         ← 1-1, ToS/consent/data region
├── AuthIdentity[]    ← 1-n, OAuth provider đã link
├── UserSession[]     ← 1-n (Phase 2)
├── LoginEvent[]      ← 1-n, có TTL
├── UserBlock[] / UserMute[] / UserFollow[]
├── DataRequest[]     ← GDPR export/delete
└── AuditLog[]        ← hành động nhạy cảm
```

Nguyên tắc: **API public chỉ được serialize từ `User` + `UserProfile`.** Mọi
bảng còn lại phải đi qua service riêng có kiểm tra quyền — không bao giờ
`include` chúng vào query trả cho client.

---

## 4. Chi tiết theo nhóm

Cột **Hiển thị**: `Public` (ai cũng xem được) · `Follower` (chỉ người follow /
tuỳ `profileVisibility`) · `Private` (chỉ chính chủ) · `System` (chỉ backend,
không bao giờ ra khỏi server) · `Mod` (chỉ moderator/admin).

### 4.1. Định danh & xác thực

**Bảng `User`** (phần định danh)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `id` | `String @id @default(uuid())` | System | UUID v4, không dùng số tuần tự → chống enumeration. **Không** đưa vào URL công khai, dùng `username` |
| `username` | `String @unique` (citext) | Public | Handle `@`. Validate `^[a-z0-9_]{3,20}$`, blocklist từ nhạy cảm + tên route hệ thống (`admin`, `api`, `home`). Rate limit đổi: tối đa 1 lần/30 ngày, giữ lịch sử để chống mạo danh |

**Bảng `AuthIdentity`** (thay `User.googleId`)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `id` | `String @id @default(uuid())` | System | |
| `userId` | `String` → `User` | System | |
| `provider` | `enum AuthProvider {GOOGLE, APPLE, GITHUB, EMAIL}` | Private | Chính chủ xem được "đã link gì" |
| `providerAccountId` | `String` | System | `@@unique([provider, providerAccountId])`. Với Google = `profile.sub` |
| `linkedAt` | `DateTime` | Private | |

> **Không lưu access token / refresh token của bên thứ ba.** Hiện tại luồng
> đăng nhập không cần gọi lại Google API sau khi sync xong, nên lưu token chỉ
> tạo thêm thứ để bị rò rỉ.

**Bảng `UserCredential`** — *chưa tạo, chỉ định nghĩa sẵn để khỏi nhét vào `User` sau này*

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `passwordHash` | `String` | System | Argon2id. Không bao giờ select ra khỏi service auth |
| `twoFactorSecret` | `String` (encrypted) | System | Mã hoá bằng key riêng, khác key của PII |
| `backupCodes` | `String[]` (mỗi code hash riêng) | System | Hash từng code, đánh dấu dùng-1-lần |

### 4.2. Public profile

**Bảng `User`** (phần hiển thị hot-path — cố ý để chung `User` vì đọc ở mọi post)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `displayName` | `String` | Public | Cho phép Unicode/emoji. Chặn ký tự điều khiển + RTL override (giả mạo tên), giới hạn 50 ký tự |
| `avatarUrl` | `String?` | Public | Chỉ nhận URL từ CDN của mình. Nếu cho upload: validate magic bytes (không tin extension), re-encode ảnh để tẩy payload, giới hạn dung lượng |
| `isVerified` | `Boolean @default(false)` | Public | **Chỉ hệ thống set**, không có API nào cho user tự đổi |
| `createdAt` | `DateTime` | Public | = "join date" |

**Bảng `UserProfile`** (1-1, phần ít đọc hơn)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `bio` | `String?` (≤ 300 ký tự) | Public | Sanitize, chặn link spam, không render HTML thô |
| `coverImageUrl` | `String?` | Public | Như `avatarUrl` |
| `location` | `String?` | Public | Text tự do, **không** geocode/lưu toạ độ — tránh suy ra địa chỉ thật |
| `websiteUrl` | `String?` | Public | Chỉ cho `http/https` (chặn `javascript:`), render kèm `rel="nofollow noopener"` |
| `pronouns` | `String?` | Public | |
| `yearsOfExperience` | `Int?` | Public | Field sẵn có, chuyển từ `User` sang đây |
| `followerCount` | `Int @default(0)` | Public | **Cache** — cập nhật bằng job/trigger, không `COUNT(*)` real-time |
| `followingCount` | `Int @default(0)` | Public | Như trên |
| `postCount` | `Int @default(0)` | Public | Như trên |

### 4.3. Cài đặt riêng tư — `UserPrivacy` (1-1)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `profileVisibility` | `enum {PUBLIC, FOLLOWERS_ONLY, PRIVATE}` | Private | **Mọi API đọc profile phải check field này** + quan hệ follow/block. Đây là điểm chống IDOR chính |
| `whoCanMessage` | `enum {EVERYONE, FOLLOWERS, NOBODY}` | Private | |
| `whoCanComment` | `enum {EVERYONE, FOLLOWERS, NOBODY}` | Private | |
| `showOnlineStatus` | `Boolean @default(true)` | Private | |
| `showLastSeen` | `Boolean @default(false)` | Private | Mặc định **tắt** — an toàn hơn cho user mới |
| `allowSearchIndexing` | `Boolean @default(true)` | Private | Điều khiển `<meta name="robots">` trên trang profile |
| `discoverableByEmail` | `Boolean @default(false)` | Private | Mặc định tắt: chặn dò tìm tài khoản qua email |

**Bảng `UserBlock`** — `(blockerId, blockedId)` unique

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `blockerId` / `blockedId` | `String` | Private (chỉ blocker) | **Chỉ query được theo `blockerId`.** Không có API nào cho phép hỏi "ai đã chặn tôi" |
| `createdAt` | `DateTime` | Private | |

`UserMute` cấu trúc y hệt, khác ngữ nghĩa (mute = ẩn nội dung, không cắt quan hệ).

### 4.4. Bảo mật tài khoản — `UserSecurity` (1-1)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `tokensValidAfter` | `DateTime?` | System | **Chốt chặn "đăng xuất mọi thiết bị"** (mục 2.3). Auth.js `jwt` callback so `token.iat` với mốc này |
| `recoveryEmail` | `String?` (enc) | Private | Tách khỏi email đăng nhập, cần verify riêng |
| `loginAlertsEnabled` | `Boolean @default(true)` | Private | |
| `deletionRequestedAt` | `DateTime?` | Private | Soft-delete, grace period 30 ngày (mục 4.9) |

**Bảng `LoginEvent`** (1-n, có retention)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `ipHash` | `String` | Private | **HMAC của IP, không lưu IP thô** — vẫn phát hiện được "thiết bị lạ" mà không giữ PII vị trí |
| `userAgent` | `String` | Private | Cắt ngắn, chỉ giữ OS/browser family |
| `country` | `String?` | Private | Suy từ IP tại thời điểm login rồi bỏ IP |
| `succeeded` | `Boolean` | Private | Lưu cả lần thất bại để phát hiện brute-force |
| `createdAt` | `DateTime` | Private | **TTL 90 ngày**, job xoá định kỳ |

**Bảng `UserSession`** — *Phase 2 (mục 2.3)*

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `id` (= `jti`) | `String @id` | System | Khớp claim `jti` trong token Auth.js |
| `deviceLabel` | `String?` | Private | "Chrome trên Windows" — để user nhận ra |
| `lastActiveAt` | `DateTime` | Private | |
| `revokedAt` | `DateTime?` | Private | Revoke = set mốc, không xoá row (giữ dấu vết điều tra) |

### 4.5. Dữ liệu liên kết mạng xã hội — `UserFollow`

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `followerId` / `followeeId` | `String` | Public* | `@@unique([followerId, followeeId])`. *Public tuỳ `profileVisibility` của followee |
| `status` | `enum {ACTIVE, PENDING}` | Public* | `PENDING` cho tài khoản private (cần duyệt) |
| `createdAt` | `DateTime` | Public* | |

Trước khi tạo follow phải check `UserBlock` cả 2 chiều — block phải thắng follow.

### 4.6. Nội dung & hoạt động

| Trường | Bảng | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `postCount`, `likeGivenCount` | `UserProfile` | Public | Cache (mục 4.2) |
| `SavedItem(userId, postId)` | bảng riêng | **Private tuyệt đối** | Không lộ ngay cả với người tạo ra post được lưu |
| `ContentReport(reporterId, targetId, reason)` | bảng riêng | Mod | Người bị báo cáo **không** xem được ai báo cáo mình. Chính người báo cáo cũng chỉ thấy trạng thái, không thấy kết luận nội bộ |

### 4.7. Trạng thái tài khoản & kiểm duyệt — `UserModeration` (1-1)

> Toàn bộ bảng này chỉ đọc được qua service có role `MODERATOR`/`ADMIN`. Không
> bao giờ `include` vào query profile.

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `status` | `enum {ACTIVE, SUSPENDED, BANNED, DEACTIVATED}` | Public (rút gọn) | Client chỉ nhận biết "tài khoản không khả dụng", **không** nhận lý do/loại |
| `suspensionReason` | `String?` | Mod | Nội bộ — lộ ra là lộ cơ chế kiểm duyệt cho kẻ lách luật |
| `suspendedUntil` | `DateTime?` | Private | Chính chủ được biết thời hạn |
| `strikeCount` | `Int @default(0)` | Mod | |
| `ageBracket` | `enum {UNDER_13, TEEN_13_17, ADULT_18_PLUS}` | System | Dẫn xuất từ `birthdate`, dùng để gate tính năng — **không bao giờ Public** |

### 4.8. Metadata hệ thống — `User` + `UserPreference`

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `createdAt` / `updatedAt` | `DateTime` | Public / System | Đã có sẵn |
| `lastLoginAt` | `DateTime?` | Private | Khác `lastSeenAt` (cái sau phụ thuộc `showLastSeen`) |
| `lastPlatform` | `enum {WEB, IOS, ANDROID}?` | System | Analytics |
| `lastAppVersion` | `String?` | System | Không ghép với ID cá nhân khi đẩy sang analytics |

### 4.9. Tuỳ chọn cá nhân hoá — `UserPreference` (1-1)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `theme` | `enum {SYSTEM, LIGHT, DARK}` | Private | |
| `language` | `String` (BCP-47, vd `vi-VN`) | Private | |
| `timezone` | `String` (IANA) | Private | |
| `notificationSettings` | `Json` | Private | Object theo từng loại: `{follow: {push,email}, comment: {...}}`. Dùng `Json` vì danh sách loại thông báo còn thay đổi nhiều |

### 4.10. Pháp lý / tuân thủ — `UserLegal` (1-1)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `termsVersion` | `String` | System | Vd `2026-07-01`. Đổi ToS → buộc chấp nhận lại |
| `termsAcceptedAt` | `DateTime` | System | |
| `consentMarketingEmail` | `Boolean @default(false)` | Private | **Opt-in tường minh** (GDPR): mặc định `false`, không tick sẵn |
| `consentUpdatedAt` | `DateTime` | System | Bằng chứng thời điểm đồng ý |
| `dataRegion` | `enum {EU, US, APAC}` | System | User EU → dữ liệu ở server EU |

**Bảng `UserPrivate`** (1-1, PII — mục 2.4)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `email` | `String @unique` | Private | Từ Google, đã verified sẵn |
| `emailVerified` | `Boolean` | System | |
| `phoneEnc` / `phoneHash` | `String?` | Private | Blind index (mục 2.4) |
| `birthdateEnc` | `String?` | Private | Giải mã chỉ khi thật cần; gate tuổi dùng `ageBracket` |

**Bảng `DataRequest`** (GDPR)

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `type` | `enum {EXPORT, DELETE}` | Private | "Right to access" + "right to be forgotten" |
| `status` | `enum {PENDING, PROCESSING, COMPLETED, FAILED}` | Private | |
| `requestedAt` / `completedAt` | `DateTime` | Private | |
| `downloadUrl` | `String?` | Private | Pre-signed URL **hết hạn ≤ 24h**, dùng 1 lần |

**Bảng `AuditLog`**

| Trường | Kiểu | Hiển thị | Ghi chú bảo mật |
|---|---|---|---|
| `actorId` | `String` | Mod | Ai thực hiện (có thể là admin ≠ chủ tài khoản) |
| `action` | `enum {EMAIL_CHANGED, USERNAME_CHANGED, PROVIDER_LINKED, SESSIONS_REVOKED, ACCOUNT_SUSPENDED, ...}` | Mod | |
| `metadata` | `Json` | Mod | **Chỉ lưu giá trị cũ/mới đã che** (`a***@gmail.com`) |
| `createdAt` | `DateTime` | Mod | Append-only, không cho update/delete |

---

## 5. Các nguyên tắc phải thực thi ở tầng code (không phải schema)

Schema đúng nhưng thực thi sai vẫn rò rỉ. 5 chỗ bắt buộc:

1. **Serializer whitelist, không blacklist.** DTO trả về liệt kê tường minh field
   được phép, không `select: *` rồi `delete` field nhạy cảm — thêm cột mới sẽ tự
   động rò.
2. **Một hàm duy nhất quyết định quyền xem profile:**
   `canViewProfile(viewerId, targetId)` — kiểm `profileVisibility` + `UserFollow`
   + `UserBlock` 2 chiều. Mọi endpoint đọc profile phải gọi nó (chống IDOR).
3. **Rate limit + audit** cho: đổi email, đổi username, link/unlink provider,
   revoke session, yêu cầu xoá tài khoản.
4. **`userId` luôn từ `req.userId`** (do `JwtAuthGuard` set), tuyệt đối không lấy
   từ body/query — đây là lỗ IDOR phổ biến nhất và đặc biệt nguy hiểm với trust
   model ở mục 2.5.
5. **Xoá thật khi hết grace period.** `deletionRequestedAt` + 30 ngày → job xoá
   cứng PII và ẩn danh nội dung (`authorId` → tombstone user), không soft-delete
   vĩnh viễn. Giữ lại `AuditLog` và hoá đơn theo nghĩa vụ pháp lý là hợp lệ.

---

## 6. Lộ trình triển khai

| Phase | Nội dung | Vì sao thứ tự này |
|---|---|---|
| 1 | `username`, `displayName`, `UserProfile`, `UserFollow`, `UserBlock` | Feed/social không chạy được nếu thiếu handle + quan hệ follow |
| 2 | `AuthIdentity` (backfill từ `googleId` rồi drop cột), `UserPrivate` tách email ra | Càng nhiều user càng khó migrate — làm sớm |
| 3 | `UserPrivacy`, `UserPreference`, `canViewProfile()` | Cần trước khi mở profile ra public |
| 4 | `UserModeration`, `ContentReport`, `AuditLog` | Cần khi có user thật báo cáo nhau |
| 5 | `UserLegal`, `DataRequest`, `LoginEvent` | Bắt buộc trước khi phục vụ user EU |
| 6 | `UserSession` (revoke từng thiết bị) | Chỉ khi thật sự cần UI quản lý thiết bị |
