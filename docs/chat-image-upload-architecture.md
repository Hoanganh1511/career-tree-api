# Kiến trúc Upload ảnh/file chat (S3) — hiện trạng & lộ trình

Tài liệu ghi **hiện trạng thật** (code đã chạy được, đã build/lint sạch) và
**thiết kế tham khảo cho phần hạ tầng AWS** (bucket policy, CloudFront, Lambda
resize, kiểm duyệt) — phần hạ tầng **chưa được provision** (không có quyền
truy cập AWS Console/IaC từ agent thực hiện việc này), viết ra để bạn áp dụng
thủ công hoặc qua Terraform/CDK khi sẵn sàng. Đọc mục 0 trước để biết chính
xác ranh giới "đã chạy" vs "tham khảo".

---

## 0. Ranh giới: cái gì ĐÃ chạy, cái gì là TÀI LIỆU THAM KHẢO

| Phần | Trạng thái |
|---|---|
| `POST /uploads` (proxy qua backend, Hướng B — code cũ) | **Đã chạy** (từ trước), giữ nguyên không đổi |
| `POST /uploads/presign` (presigned POST, Hướng A) | **Code mới, đã build/lint sạch** — nhưng AWS credentials trong `.env` hiện đang trống nên chưa test được với S3 thật |
| Job dọn rác S3 định kỳ (`@Cron`) | **Code mới, đã build sạch** — cùng lý do trên, chưa chạy thật với S3 |
| Frontend chuyển sang dùng `/uploads/presign` | **CHƯA làm** — `MessagesShell.tsx` vẫn gọi `/uploads` (proxy) như cũ. Mục 8 mô tả kiến trúc đích, không phải code đã có |
| S3 bucket policy, CloudFront distribution, Lambda resize, Rekognition | **Tham khảo/thiết kế** — cấu hình/code mẫu, KHÔNG được provision từ phiên làm việc này (không có AWS Console/Terraform access) |

---

## 1. So sánh Hướng A/B/C & khuyến nghị

| | **Hướng A** — Presigned URL, client upload thẳng S3 | **Hướng B** — Proxy qua backend (hiện trạng cũ) | **Hướng C** — Presigned URL + xử lý bất đồng bộ (Lambda hậu kỳ) |
|---|---|---|---|
| Băng thông server | Không tốn (client nói chuyện thẳng S3) | Tốn (mỗi file qua RAM/network backend 2 lần: nhận từ client + gửi lên S3) | Không tốn (giống A) |
| Độ trễ upload | Nhanh nhất | Chậm hơn (thêm 1 hop) | Nhanh (giống A), nhưng ảnh "sẵn sàng đầy đủ" (có thumbnail) trễ hơn vài giây |
| Độ phức tạp code | Trung bình (presigned policy, FE tự PUT/POST) | Thấp (chỉ 1 endpoint, dùng Multer có sẵn) | Cao (thêm Lambda, S3 event trigger, callback/poll cập nhật trạng thái) |
| Thumbnail/nhiều size | Không có sẵn — phải tự thêm | Có thể resize NGAY trong request (tốn CPU backend) | Có, do Lambda xử lý sau khi file lên S3 |
| Phù hợp quy mô | Vài trăm → hàng triệu upload/ngày, đây là pattern chuẩn công nghiệp | Prototype/MVP, lượng upload thấp, ưu tiên đơn giản | Khi ĐÃ cần thumbnail/nén ảnh thật sự (không phải "có thể cần sau này") |

**Khuyến nghị theo quy mô sản phẩm hiện tại** (chat 1-1, MVP, chưa có traffic
thật, chưa cấu hình AWS credentials): **Hướng A**, không kèm Hướng C ngay.
Lý do:
- App hiện KHÔNG hiển thị nhiều size ảnh khác nhau ở bất kỳ đâu (không có
  thumbnail feed, không có gallery) — bubble chat chỉ hiện 1 ảnh full-size co
  giãn theo CSS. Thumbnail server-side chưa giải quyết vấn đề thật nào ở quy
  mô này, chỉ thêm hạ tầng (Lambda + S3 event + bảng theo dõi trạng thái xử
  lý) mà không đổi trải nghiệm người dùng.
- Hướng B (hiện tại) vẫn **hoạt động đúng** — không phải đổi vì nó "sai", mà
  vì Hướng A giảm tải backend + nhanh hơn khi traffic tăng, là hướng chuẩn
  công nghiệp cho use-case này.
- Khi nào cần nghĩ tới Hướng C: xem mục 6.4 ("khi nào thumbnail thật sự cần
  thiết").

---

## 2. Thiết kế API NestJS (đã triển khai)

### `POST /uploads` (giữ nguyên, không đổi)
Proxy qua backend — `multipart/form-data` (`file` + `kind`), Multer buffer
trong RAM, backend tự `PutObjectCommand`. Xem `src/upload/upload.service.ts`
hàm `upload()`. Đây vẫn là đường FE đang dùng thật.

### `POST /uploads/presign` (mới — Hướng A)
`src/upload/upload.controller.ts` + `src/upload/upload.service.ts` hàm
`createPresignedUpload()`.

Request body (`PresignUploadDto`, `src/upload/dto/presign-upload.dto.ts`):

```ts
{
  kind: "image" | "file" | "voice";
  contentType: string;   // vd "image/png" - phai nam trong ALLOWED_MIME_TYPES[kind]
  fileName: string;
  fileSize: number;      // bytes - client tu bao, S3 VAN tu kiem tra that qua policy
}
```

Response:

```ts
{
  uploadUrl: string;   // POST endpoint (chinh la URL cua bucket)
  fields: Record<string, string>;  // form fields BAT BUOC phai gui kem (bao gom chu ky)
  key: string;          // S3 object key vua sinh
  publicUrl: string;    // URL de hien thi/luu vao Message.attachmentUrl SAU khi upload xong
  expiresIn: number;    // giay (300 = 5 phut)
}
```

**Vì sao presigned POST (`createPresignedPost`) chứ không phải presigned PUT
đơn giản (`getSignedUrl` cho `PutObjectCommand`)**: presigned PUT chỉ ký
CHÍNH XÁC URL, không ràng buộc được gì về nội dung request — client có thể
đổi `Content-Type`/kích thước sau khi có URL. Presigned POST có `Conditions`
(ở đây: `content-length-range` theo `MAX_UPLOAD_SIZE[kind]`, và
`Content-Type` phải khớp CHÍNH XÁC giá trị đã khai báo lúc xin URL) — S3 tự
**từ chối** request không khớp điều kiện, đúng yêu cầu "ràng buộc Content-Type,
giới hạn kích thước file" ở TẦNG S3, không chỉ validate phía FE.

Giới hạn theo từng `kind` (`MAX_UPLOAD_SIZE`/`ALLOWED_MIME_TYPES` trong
`presign-upload.dto.ts`) — tách riêng thay vì 1 giới hạn 25MB dùng chung như
code cũ, vì ảnh/voice không cần lớn như file đính kèm thông thường:

| kind | Content-Type cho phép | Giới hạn |
|---|---|---|
| image | jpeg, png, webp, gif | 10MB |
| file | pdf, zip, doc(x), xls(x), txt, csv | 25MB |
| voice | webm, ogg, mpeg, mp4, wav | 15MB |

### Endpoint callback từ Lambda — KHÔNG xây (chưa cần)

Spec gốc đề cập "endpoint (nếu cần) nhận callback/event xử lý xong từ
Lambda" — đây thuộc Hướng C. Vì Hướng C chưa được chọn triển khai ở pass này
(mục 1), xây 1 endpoint mà không có Lambda nào thật sự gọi tới sẽ là code
chết/chức năng giả — không làm. Xem mục 6.4 nếu sau này chuyển sang Hướng C.

---

## 3. Cấu trúc S3 key (đã áp dụng cho cả 2 đường upload)

```
chat-images/<uuid>-<safe-filename>
chat-files/<uuid>-<safe-filename>
chat-voice/<uuid>-<safe-filename>
```

`safe-filename`: tên gốc sau khi loại ký tự không an toàn làm S3 key
(khoảng trắng, dấu tiếng Việt, ký tự đặc biệt) — xem `createPresignedUpload()`.
Tên gốc "thật" (có dấu, khoảng trắng) vẫn được giữ nguyên trong
`Message.attachmentName` (lưu DB, không phụ thuộc S3 key) nên không mất
thông tin hiển thị cho người dùng.

Prefix `chat-` dùng chung giữa 2 đường upload để job dọn rác (`deleteOrphanedUploads()`)
chỉ cần quét 1 prefix duy nhất.

---

## 4. S3 bucket policy & CloudFront — THAM KHẢO (chưa provision)

### 4.1. Hiện trạng: bucket public-read

Theo comment gốc trong `upload.service.ts`, bucket cần bật public read qua
**bucket policy** (không phải object ACL — AWS chặn ACL public trên bucket
mới theo mặc định) vì FE hiển thị ảnh/audio trực tiếp từ URL trả về:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadChatUploads",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<BUCKET_NAME>/chat-*"
    }
  ]
}
```

### 4.2. Nếu chuyển sang private + CloudFront (khuyến nghị dài hạn nếu dữ liệu nhạy cảm)

Vì đây là **ảnh chat riêng tư giữa 2 người dùng** (không phải nội dung công
khai như bài viết/community post), bucket public-read có nghĩa: bất kỳ ai
đoán được/có được URL đều xem được ảnh, vĩnh viễn (không hết hạn). Nếu sản
phẩm cần kiểm soát chặt hơn ("chỉ thành viên hội thoại mới xem được"), hướng
đúng là:

1. Bucket **private hoàn toàn** (chặn mọi public access).
2. CloudFront distribution đặt trước bucket, dùng **Origin Access Control
   (OAC)** — thay thế OAI cũ, cách AWS khuyến nghị hiện tại — để CloudFront
   là bên DUY NHẤT được đọc bucket.
3. CloudFront bật **Signed URL** (đơn giản hơn Signed Cookie cho use-case
   "1 ảnh, 1 tin nhắn" — Signed Cookie phù hợp hơn khi cần cấp quyền xem CẢ
   MỘT session/nhiều tài nguyên cùng lúc, không phải trường hợp ở đây).
4. NestJS cần thêm 1 endpoint `GET /uploads/:key/view-url` — kiểm tra
   `assertParticipant` (người gọi phải là thành viên hội thoại chứa tin nhắn
   tham chiếu tới `key` đó) rồi ký CloudFront Signed URL bằng
   `@aws-sdk/cloudfront-signer` (`getSignedUrl` — cần `CLOUDFRONT_KEY_PAIR_ID`
   + private key lưu ở AWS Secrets Manager hoặc biến môi trường).
5. **Đánh đổi lớn**: `Message.attachmentUrl` hiện lưu URL "vĩnh viễn" — nếu
   chuyển sang signed URL (hết hạn sau vài phút/giờ), schema cần đổi từ lưu
   URL sang lưu **S3 key**, và FE phải gọi lại endpoint ký URL mỗi lần hiển
   thị (hoặc BE tự ký lại khi trả `listMessages`). Đây là thay đổi schema +
   luồng dữ liệu không nhỏ — **không làm trong pass này**, chỉ ghi lại hướng
   đi nếu yêu cầu bảo mật thực sự phát sinh.

Reference CloudFront distribution (outline, không phải Terraform hoàn
chỉnh):

```jsonc
{
  "Origins": [{
    "DomainName": "<bucket>.s3.<region>.amazonaws.com",
    "OriginAccessControlId": "<OAC_ID>",
    "S3OriginConfig": { "OriginAccessIdentity": "" } // rong khi dung OAC
  }],
  "DefaultCacheBehavior": {
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedKeyGroups": ["<key-group-id-cho-signed-url>"],
    "CachePolicyId": "<managed-caching-optimized-policy-id>"
  }
}
```

### 4.3. S3 Lifecycle policy (tối ưu chi phí, độc lập với việc chọn public/private)

```json
{
  "Rules": [{
    "ID": "chat-uploads-tiering",
    "Status": "Enabled",
    "Filter": { "Prefix": "chat-" },
    "Transitions": [
      { "Days": 90, "StorageClass": "STANDARD_IA" },
      { "Days": 365, "StorageClass": "GLACIER" }
    ]
  }]
}
```
Áp dụng độc lập, không phụ thuộc Hướng A/B/C — chỉ là chính sách vòng đời S3,
áp dụng được ngay cả với bucket public hiện tại.

---

## 5. Xử lý nhiều kích thước ảnh — THAM KHẢO (chưa cần ở quy mô hiện tại)

Như đã nêu ở mục 1, app hiện KHÔNG có nơi nào cần hiển thị ảnh ở nhiều kích
thước khác nhau. Ghi lại hướng đi cho khi tính năng này thật sự cần (ví dụ:
thêm gallery ảnh trong `MessageInfoPanel` "File & Media", hoặc bubble chat
cần load nhanh bằng thumbnail trước khi tải full-size):

**Khuyến nghị: AWS Serverless Image Handler** (giải pháp CloudFormation dựng
sẵn của AWS) thay vì tự viết Lambda từ đầu — resize theo query param
(`?width=200&height=200`, dùng Sharp bên trong), tự có CloudFront + cache,
không phải maintain code resize/không phải tự viết lại logic đã có sẵn,
migrate nhanh khi cần.

Nếu vẫn muốn tự viết Lambda (linh hoạt hơn, ví dụ cần watermark/logic riêng),
reference Lambda (Node.js + `sharp`, trigger bởi S3 `ObjectCreated` event
qua prefix `chat-images/`):

```js
// reference only - CHUA deploy, CHUA test
const sharp = require("sharp");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({});
const SIZES = { thumb: 200, medium: 800 };

exports.handler = async (event) => {
  const { bucket, object } = event.Records[0].s3;
  const key = decodeURIComponent(object.key.replace(/\+/g, " "));
  if (key.includes("/thumb/") || key.includes("/medium/")) return; // tranh vong lap

  const original = await s3.send(new GetObjectCommand({ Bucket: bucket.name, Key: key }));
  const buffer = await original.Body.transformToByteArray();

  for (const [variant, width] of Object.entries(SIZES)) {
    const resized = await sharp(buffer).resize({ width }).toBuffer();
    const variantKey = key.replace("chat-images/", `chat-images/${variant}/`);
    await s3.send(new PutObjectCommand({
      Bucket: bucket.name, Key: variantKey, Body: resized, ContentType: "image/webp",
    }));
  }
};
```

Key convention nếu triển khai: `chat-images/<uuid>-<name>` (gốc),
`chat-images/thumb/<uuid>-<name>`, `chat-images/medium/<uuid>-<name>` — FE
suy ra URL biến thể từ URL gốc bằng cách chèn `/thumb/`/`/medium/`, không
cần lưu thêm field trong DB.

---

## 6. Bảo mật & kiểm duyệt

### 6.1. Đã làm — validate Content-Type/size trong presigned POST policy
Xem mục 2 — `Conditions` của `createPresignedPost` chặn thật ở tầng S3, không
chỉ validate FE. Đây là phần bảo mật chính đã triển khai thật trong pass này.

### 6.2. Presigned URL hết hạn ngắn — đã làm
`PRESIGN_EXPIRY_SECONDS = 300` (5 phút) trong `upload.service.ts`.

### 6.3. Quét virus/malware — THAM KHẢO

Spec gốc ghi "AWS không có sẵn dịch vụ quét virus miễn phí tích hợp" — **cập
nhật**: AWS hiện có **Amazon GuardDuty Malware Protection for S3** (ra mắt
sau nhiều thiết kế cũ vẫn còn lưu hành) — quét file mới upload tự động, tự
tag/cách ly file nhiễm mã độc, không cần tự dựng Lambda + ClamAV layer như
trước. Không miễn phí (tính phí theo GB quét) nhưng là lựa chọn "managed" nếu
cần, thay vì buộc phải tự implement Lambda+ClamAV. Chưa bật (cần bật ở tầng
AWS Console/tài khoản, ngoài phạm vi code repo).

### 6.4. Kiểm duyệt nội dung (Rekognition) — THAM KHẢO

Nếu sản phẩm cần tự động phát hiện ảnh nhạy cảm gửi trong chat, reference
code (gọi trong Lambda hậu kỳ upload, KHÔNG gọi đồng bộ trong request tạo
message — độ trễ Rekognition không phù hợp cho luồng gửi tin nhắn realtime):

```ts
// reference only - chua deploy
import { RekognitionClient, DetectModerationLabelsCommand } from "@aws-sdk/client-rekognition";

const rekognition = new RekognitionClient({});

async function moderateImage(bucket: string, key: string) {
  const result = await rekognition.send(new DetectModerationLabelsCommand({
    Image: { S3Object: { Bucket: bucket, Name: key } },
    MinConfidence: 80,
  }));
  return result.ModerationLabels ?? []; // rong = khong phat hien gi
}
```
Đây chính là điểm nối tự nhiên với **Hướng C** (mục 1) — Lambda trigger bởi
S3 event vừa resize thumbnail vừa gọi Rekognition, cập nhật trạng thái
message qua endpoint callback (mục 2, phần "chưa xây").

---

## 7. Dọn rác S3 (orphan cleanup) — đã triển khai

`UploadService.deleteOrphanedUploads()` + cron `cleanupOrphanedUploadsJob()`
(`@Cron(CronExpression.EVERY_HOUR)`, đăng ký qua `ScheduleModule.forRoot()`
trong `app.module.ts`):

1. List toàn bộ object S3 dưới prefix `chat-` có `LastModified` cũ hơn 60
   phút (tránh xoá nhầm file đang trong lúc client upload xong nhưng chưa
   kịp gọi `sendMessage`).
2. Đối chiếu với `Message.attachmentUrl` trong DB — key nào **không** được
   tham chiếu bởi bất kỳ Message nào thì xoá qua `DeleteObjectsCommand`
   (batch, tối đa 1000 key/lần).
3. Best-effort — lỗi chỉ log, không làm crash app.

**Giới hạn đã biết** (ghi lại để không phải đoán lại): ở quy mô lớn hơn
nhiều (hàng chục nghìn upload/ngày), việc `ListObjectsV2` toàn bộ prefix mỗi
giờ + tải toàn bộ `attachmentUrl` từ DB để so khớp trong bộ nhớ sẽ không mở
rộng tốt — lúc đó nên chuyển sang: S3 Lifecycle rule tự xoá object có tag
`pending=true` (gắn tag lúc sinh presigned URL, gỡ tag khi `sendMessage`
thành công) sau X giờ, tránh phải quét+so khớp thủ công.

---

## 8. Luồng React (mô tả kiến trúc — chưa code, theo đúng yêu cầu)

> `MessagesShell.tsx` HIỆN TẠI vẫn dùng `uploadChatAttachmentAction` →
> `POST /uploads` (Hướng B). Mô tả dưới đây là kiến trúc ĐÍCH khi chuyển
> sang Hướng A — chưa áp dụng vào code.

### 8.1. State máy trạng thái 1 attachment đang soạn

```
idle → selecting (chọn file, tạo objectURL preview NGAY, không đợi mạng)
     → requesting-presign (gọi POST /uploads/presign)
     → uploading (POST multipart thẳng lên S3 bằng uploadUrl+fields, theo dõi progress)
     → uploaded (có publicUrl, sẵn sàng đính kèm khi bấm Gửi)
     → (lỗi ở bất kỳ bước nào) → failed (giữ lại file gốc trong state để "Thử lại" không bắt chọn lại file)
```

Tương tự cấu trúc `PendingAttachment` đã có (`kind`, `file`, `previewUrl`,
`uploading`, `uploaded`) — chỉ cần thêm field `progress?: number` và
`error?: string`, không cần đổi kiến trúc tổng thể.

### 8.2. Progress bar thật — vì sao cần XHR, không dùng `fetch`

`fetch()` không có sự kiện `upload progress` (chỉ có `response` stream đọc
progress, không phải request/upload). Để có progress bar thật khi POST file
lên S3, phải dùng `XMLHttpRequest` trực tiếp:

```
xhr.upload.addEventListener("progress", (e) => {
  if (e.lengthComputable) setProgress(e.loaded / e.total);
});
```
Đây là điểm khác biệt kỹ thuật quan trọng nhất so với luồng hiện tại (dùng
`fetch` qua server action, không có progress event nào cả — hiện chỉ có
`uploading: true/false`).

### 8.3. Retry khi thất bại
Giữ nguyên `File` object gốc trong state khi bước `uploading` thất bại (mất
mạng giữa chừng) — nút "Thử lại" gọi lại đúng luồng `requesting-presign →
uploading` với CÙNG file, không bắt người dùng chọn lại. Presigned URL cũ có
thể đã hết hạn (5 phút) nên "Thử lại" nên luôn xin URL mới, không tái sử
dụng `uploadUrl` cũ.

### 8.4. Lazy load ảnh trong luồng chat (kết hợp load-more lịch sử)
Với tin nhắn ảnh tải qua "xem lịch sử cũ hơn" (tính năng Load More Messages
đã có, xem `docs/chat-search-architecture.md` hoặc code
`handleLoadOlder`/sentinel trong `MessagesShell.tsx`), dùng `loading="lazy"`
trên thẻ `<img>` (native, không cần thư viện) — trình duyệt tự trì hoãn tải
ảnh chưa vào viewport, quan trọng khi 1 lần "tải thêm" có thể kéo về nhiều
tin nhắn ảnh cùng lúc.

### 8.5. Trạng thái "đang xử lý thêm" — CHỈ áp dụng nếu chuyển sang Hướng C
Vì pass này KHÔNG triển khai Hướng C (mục 1), trạng thái `processing` (chờ
Lambda tạo thumbnail xong) trong state máy KHÔNG cần thêm bây giờ — ghi chú
lại vị trí nó sẽ chèn vào (giữa `uploaded` và hiển thị "sẵn sàng đầy đủ") để
không phải thiết kế lại state máy từ đầu nếu sau này thật sự cần.

---

## 9. Edge case đã cân nhắc (đối chiếu với danh sách spec gốc)

| Edge case | Xử lý |
|---|---|
| Upload xong S3 nhưng `sendMessage` không được gọi (mất mạng/crash) | Job dọn rác định kỳ (mục 7) — **đã làm** |
| Giới hạn số lượng/tổng dung lượng ảnh gửi 1 lần | **Chưa làm** — hiện tại composer chỉ hỗ trợ 1 attachment/lần gửi (xem `PendingAttachment`, không phải mảng) nên vấn đề "nhiều ảnh cùng lúc" chưa phát sinh ở tầng UI hiện tại |
| Bị kick khỏi nhóm — có giữ quyền xem ảnh cũ | Không áp dụng ở app hiện tại — `Conversation` chỉ hỗ trợ 1-1 (2 participant cố định, không có khái niệm "nhóm"/kick, xem comment trong `schema.prisma`) |
| Hội thoại bị xoá/giải tán — dọn S3 tương ứng | Chưa có tính năng "xoá hội thoại" trong app hiện tại — khi có, cần thêm bước xoá object S3 tương ứng vào flow xoá conversation (hoặc để job dọn rác mục 7 tự nhặt sau khi Message bị xoá theo Cascade) |
| Chi phí băng thông khi tải lại ảnh cũ nhiều lần | Chưa có CloudFront (mục 4.2) nên chưa có cache TTL để cấu hình — mỗi lần xem là 1 lần GET thẳng S3. Ghi nhận là lý do chính để cân nhắc CloudFront khi traffic tăng |
