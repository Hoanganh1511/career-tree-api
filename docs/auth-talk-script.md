# Kịch bản chia sẻ: "Làm auth cho career-tree"

Kịch bản buổi chia sẻ nội bộ ~20 phút + Q&A. Cấu trúc theo **quyết định** chứ
không theo thứ tự file code — người nghe nhớ được lý do, không nhớ được đường
dẫn.

Tài liệu kỹ thuật đi kèm: [`auth-architecture.md`](./auth-architecture.md).

---

## Mở đầu (1 phút)

> "Trước khi bắt đầu, một câu hỏi: trong dự án gần nhất của mọi người, **JWT
> được lưu ở đâu?**"
>
> *(chờ trả lời — gần như chắc chắn sẽ có người nói localStorage)*
>
> "Ok. Hôm nay mình chia sẻ về auth của career-tree. Mình sẽ không đi qua từng
> file — mình đi qua **4 quyết định** và lý do đằng sau. Cái đầu tiên chính là
> câu hỏi vừa rồi."

---

## Phần 1 — Quyết định 1: Không tự làm mật khẩu (4 phút)

**Nói:**

> "Career-tree không có bảng password. Không có cột `passwordHash`, không có
> luồng quên mật khẩu, không có 2FA tự viết. Đăng nhập 100% qua Google."

**Lý do — đưa ra dưới dạng thứ mình *không* phải làm:**

- Không có luồng reset password → mất đi bề mặt bị tấn công nhiều nhất
- Không có credential stuffing (người dùng dùng lại mật khẩu ở nơi khác)
- Không phải tự lưu 2FA secret, backup code, rate limit đăng nhập sai
- Google đã làm tất cả những thứ đó tốt hơn mình

**Điểm kỹ thuật cần nhấn — OAuth ≠ OIDC:**

> "Chỗ này nhiều người làm sai. OAuth 2.0 sinh ra để **uỷ quyền truy cập tài
> nguyên** — 'cho app này đọc Google Drive của tôi'. Nó *không* được thiết kế
> để trả lời 'ai đang đăng nhập'.
>
> Cái trả lời câu hỏi đó là **OIDC** — phần mở rộng của OAuth, thêm vào một thứ
> gọi là **ID token**.
>
> Lỗi kinh điển: lấy access token rồi gọi userinfo endpoint để lấy email, xong
> coi email đó là danh tính. Access token không có chữ ký định danh cho *app của
> bạn* — nó có thể là token được cấp cho một app khác."

**Cho xem code — 2 dòng thôi:**

```js
// @auth/core/lib/actions/callback/oauth/callback.js:168
const idTokenClaims = o.getValidatedIdTokenClaims(processedCodeResponse);
profile = idTokenClaims;
```

> "Đây là trong ruột Auth.js. `profile` mà mình nhận được **chính là ID token đã
> verify** — chữ ký qua JWKS của Google, kiểm `iss`, `aud`, `exp`, `nonce`. Nên
> khi mình viết `profile.sub`, đó là định danh đã được chứng minh, không phải
> một cái email nhặt về từ đâu đó."

**Chốt phần 1:**

> "Và một điểm nữa: **mình không lưu access token của Google ở đâu cả.** Lấy
> `sub` xong là vứt. Không lưu thì không rò được."

---

## Phần 2 — Quyết định 2: Ai giữ token? (5 phút)

**Quay lại câu hỏi mở đầu:**

> "Giờ quay lại câu hỏi đầu buổi. Nếu để JWT trong localStorage, thì **bất kỳ
> đoạn JavaScript nào** chạy trên trang đó đều đọc được nó. Một thư viện npm bị
> chèn mã độc, một cái XSS ở ô comment — token đi luôn. Đây là một trong những
> lỗi phổ biến nhất 2024–2025."

**Giải pháp — BFF, và nói rõ nó không phải mình nghĩ ra:**

> "Cái mình dùng là **BFF — Backend For Frontend**. OWASP khuyến nghị chính thức
> trong tài liệu về bảo mật SPA. Ý tưởng một câu: **trình duyệt không bao giờ
> chạm vào token.**"

**Vẽ lên bảng:**

```
Browser  ──cookie HttpOnly──>  Next.js  ──Bearer token──>  NestJS
   ↑                              ↑
   không đọc được cookie          nơi duy nhất biết token
   bằng JavaScript
```

> "Trình duyệt chỉ có một cái cookie `HttpOnly` — JavaScript **không đọc được**,
> kể cả code của chính mình. Còn token gọi API thì được Next.js sinh ra ở phía
> server, gắn vào request, rồi vứt. Nó chưa bao giờ tồn tại trong trình duyệt.
>
> XSS vẫn có thể xảy ra — nhưng kẻ tấn công **không lấy được token mang đi chỗ
> khác dùng**. Đó là khác biệt lớn nhất."

**Chỗ mình lệch chuẩn — nói thẳng, đừng giấu:**

> "Có một chỗ mình lệch khỏi BFF chuẩn. BFF sách vở thì cookie chứa một
> **session ID mờ**, trỏ tới session lưu trong Redis hay DB. Của mình dùng
> `strategy: 'jwt'` — cookie tự nó chứa state, không có store nào cả.
>
> Đổi lại: **không revoke được session.** Mình sẽ quay lại chuyện này ở phần 4."

---

## Phần 3 — Quyết định 3: Backend tin ai? (4 phút)

> "Câu hỏi tiếp: NestJS làm sao biết request này là của user nào?"

**Mô tả cái đã làm:**

> "Next.js tự ký một token nội bộ, HS256, **sống 60 giây**, `sub` là userId.
> NestJS verify bằng secret dùng chung. Cái này có tên: **Trusted Subsystem**."

**Và ngay lập tức nói cái giá:**

> "Nghe thì gọn. Nhưng phải nói thẳng cái giá: `INTERNAL_API_SECRET` là **master
> key**. Ai ký được nó thì mạo danh được **mọi user trong hệ thống**.
>
> Nó chỉ an toàn với đúng 2 điều kiện:
>
> 1. NestJS không expose ra internet
> 2. `userId` truyền vào hàm ký **luôn lấy từ session**, không bao giờ từ input
>    của client
>
> Hiện tại cả hai đều đúng. Nhưng đây là **giả định ngầm** — không có gì trong
> code bắt buộc điều đó. Chỉ cần một người viết một server action nhận `userId`
> từ body là xong phim. Nên mình ghi hẳn vào doc, không để trong đầu."

**Một chi tiết nhỏ đáng nhắc — 404 vs 403:**

> "Khi bạn gọi tới một workspace không phải của bạn, API trả **404 chứ không
> phải 403**.
>
> Vì trả 403 là đang nói: 'cái này có tồn tại, chỉ là mày không có quyền'. Nó tự
> nó là rò rỉ thông tin — người ta dò được ID nào tồn tại. 404 thì không nói gì cả."

---

## Phần 4 — Hai lỗ hổng tự tìm ra khi rà lại (4 phút)

> "Phần này mình thấy đáng giá nhất. Sau khi làm xong, mình ngồi đối chiếu lại
> với chuẩn và tìm ra 2 chỗ."

### Lỗ 1 — hai loại token, một secret

> "Hệ thống có 2 loại token: token gọi API (có `sub`), và token dùng lúc đăng
> nhập để đồng bộ user (không có `sub`, vì lúc đó chưa biết userId).
>
> Cả hai **ký bằng cùng một secret**. Vậy cái gì ngăn token loại này lọt qua
> guard của loại kia?
>
> Câu trả lời lúc đó là: **không có gì cả.** Nó không lọt được chỉ vì token sync
> *tình cờ* thiếu `sub` nên guard kia trượt. Đó là **may mắn, không phải thiết
> kế** — và may mắn thì không bền: chỉ cần sau này ai đó thêm `sub` vào token
> sync cho tiện là thủng."

**Cách sửa — chuẩn JWT có sẵn:**

```ts
// Ký (enggo)
.setIssuer("enggo-web")
.setAudience("career-tree-api")        // token sync: "career-tree-api/sync"

// Verify (NestJS)
this.jwt.verifyAsync(token, {
  audience: AUDIENCE_API,
  issuer: TOKEN_ISSUER,
});
```

> "`aud` và `iss` là claim chuẩn của JWT, sinh ra đúng cho việc này. Giờ token
> sai `aud` bị từ chối ngay ở bước verify — không còn phụ thuộc vào may rủi."

### Lỗ 2 — không có cách nào đăng xuất khỏi thiết bị khác

> "Kịch bản: mình đăng nhập ở máy công ty, về nhà nhớ ra chưa đăng xuất. Làm gì?
>
> Trước đó: **không làm gì được.** Session là JWT stateless, server không giữ
> bản ghi nào để xoá. Nút 'Đăng xuất mọi thiết bị' trong Settings là **nút giả**
> — bấm không có gì xảy ra."

**Cách sửa — không cần đập đi cơ chế session:**

> "Có 2 hướng. Hướng 'đúng sách' là bỏ JWT stateless, chuyển sang session store
> — nhưng thế là đổi cả kiến trúc.
>
> Hướng mình chọn: thêm **một cột duy nhất** — `tokensValidAfter`."

```ts
// Guard: mọi token phát hành TRƯỚC mốc này đều vô hiệu
if (payload.iat < Math.floor(user.tokensValidAfter.getTime() / 1000)) {
  throw new UnauthorizedException();
}
```

> "Bấm nút → ghi thời điểm hiện tại vào cột đó → mọi token cũ chết ngay. Một
> cột, một phép so sánh.
>
> Chi phí: thêm một lượt đọc DB mỗi request. Nhưng `OwnershipService` **vốn đã**
> query DB mỗi request rồi, nên không phát sinh gì mới về mặt bậc chi phí.
>
> Giới hạn: đây là công tắc **toàn cục** — đăng xuất tất cả, không chọn được
> từng thiết bị. Muốn per-device thì phải thêm `jti` và bảng session. **Mình
> chưa làm, vì chưa cần** — và mình ghi rõ điều đó trong doc thay vì để người
> sau tự đoán."

---

## Phần 5 — Ba bài học (2 phút)

> "Ba thứ mình rút ra:"

**1. Biết mình đang ở chuẩn nào — và lệch ở đâu.**

> "Kiến trúc này không phải mình nghĩ ra: OIDC cho tầng đăng nhập, BFF cho tầng
> session. Cái đáng giá không phải là 'em làm đúng chuẩn' — mà là **biết chính
> xác mình lệch chỗ nào và lệch có chủ đích**. Mình lệch 1 chỗ: session stateless
> thay vì có store. Mình biết cái giá là mất khả năng revoke, và mình chấp nhận."

**2. Thứ không lưu thì không rò.**

> "Không lưu access token của Google. Không để token trong localStorage. Nhiều
> vấn đề bảo mật giải được bằng cách **không giữ thứ đó ngay từ đầu**, chứ không
> phải bằng cách giữ nó cẩn thận hơn."

**3. Ghi lại giả định, đừng để trong đầu.**

> "Cái nguy hiểm nhất trong hệ thống này không phải một dòng code sai — mà là
> hai **giả định ngầm**: 'NestJS không expose ra ngoài' và 'userId luôn từ
> session'. Code không cưỡng chế được chúng. Người vào sau không có cách nào
> biết. Nên mình ghi hẳn vào doc kèm hậu quả nếu vi phạm."

---

## Kết (30 giây)

> "Tóm lại: đăng nhập bằng OIDC qua Google, session giữ theo kiểu BFF nên trình
> duyệt không bao giờ có token, backend tin Next.js theo mô hình trusted
> subsystem. Hai lỗ tự rà ra được đã vá. Cái chưa làm thì đã ghi ra kèm lý do.
>
> Doc kỹ thuật đầy đủ ở `docs/auth-architecture.md`."

---

## Phụ lục — Câu hỏi hay gặp

**"Sao không dùng session store luôn cho xong?"**
> Vì Next.js trong dự án này không kết nối DB trực tiếp — mọi thứ đi qua NestJS
> API. Thêm Prisma adapter vào Next.js sẽ tạo đường ghi DB thứ hai song song với
> NestJS, phá vỡ ranh giới kiến trúc hiện tại. Đánh đổi đó đắt hơn cái mình được.

**"60 giây có ngắn quá không? Request chậm thì sao?"**
> Token được mint **ngay tại thời điểm gọi**, không tái sử dụng. 60s là thời gian
> sống của một request, không phải của một phiên. Nếu một request chạy quá 60s
> thì vấn đề nằm ở chỗ khác.

**"Sao `SameSite` là `Lax` mà không phải `Strict`?"**
> Vì `Strict` sẽ làm gãy redirect callback quay về từ Google — cookie không được
> gửi kèm khi điều hướng từ domain khác sang. Đây là lựa chọn cố ý, đừng "sửa".

**"Nếu `INTERNAL_API_SECRET` bị lộ thì sao?"**
> Mất tất cả — mạo danh được mọi user. Hiện chưa có cơ chế rotation (cần hỗ trợ
> 2 secret song song lúc xoay). Đây là món nợ kỹ thuật đã biết, nằm trong danh
> sách "còn lại chưa làm".

**"Có kiểm thử tự động cho phần auth không?"**
> Chưa. Đây là khoảng trống thật — hiện chỉ dựa vào typecheck và test tay.
