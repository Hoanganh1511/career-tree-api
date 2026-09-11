import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_SIZE,
  PresignUploadDto,
  UploadKind,
} from './dto/presign-upload.dto';

// Thu muc S3 dung chung cho CA 2 duong upload (proxy cu qua upload() VA
// presigned moi qua createPresignedUpload()) - GIU CHUNG 1 prefix "chat-" de
// deleteOrphanedUploads() quet dung ca 2 nguon.
export const KIND_TO_FOLDER: Record<UploadKind, string> = {
  image: 'chat-images',
  file: 'chat-files',
  voice: 'chat-voice',
};

// URL (POST-policy hoac PUT) con hieu luc trong 5 phut - du de user chon
// xong bam gui ngay, ngan du de giam rui ro URL bi lo/dung lai sau nay (xem
// docs/chat-image-upload-architecture.md muc bao mat).
const PRESIGN_EXPIRY_SECONDS = 300;

// Upload chat (anh/file/ghi am) - 2 duong song song:
// 1) upload() - PROXY QUA BACKEND (huong cu, van la duong FE dang dung THAT
//    su hom nay - xem uploadChatAttachmentAction o enggo). Giu nguyen, KHONG
//    xoa, de khong lam gian doan tinh nang dang chay.
// 2) createPresignedUpload() - PRESIGNED POST (Huong A, huong khuyen nghi -
//    xem docs/chat-image-upload-architecture.md) - endpoint moi, hoat dong
//    doc lap, FE CHUA chuyen sang dung (viec chuyen doi la buoc rieng, theo
//    dung kien truoc da mo ta trong tai lieu).
// Can 4 bien trong .env: AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID,
// AWS_SECRET_ACCESS_KEY (2 bien sau S3Client tu doc qua default credential
// provider chain, khong truyen thang vao constructor). Bucket can bat public
// read qua BUCKET POLICY (khong phai object ACL) vi FE hien anh/audio truc
// tiep tu URL tra ve, khong dung presigned GET - xem tai lieu neu muon
// chuyen sang bucket private + CloudFront signed URL.
@Injectable()
export class UploadService {
  private bucket = process.env.AWS_S3_BUCKET;
  private region = process.env.AWS_REGION;
  // Khoi tao TRE (khong phai field initializer nhu truoc) - S3Client() cua
  // SDK ban nay throw NGAY ("Region is missing") khi region rong luc
  // constructor chay, khong doi den luc goi API nhu ban cu. Field
  // initializer chay VO DIEU KIEN moi lan NestJS tao UploadService (tuc luc
  // app khoi dong) - lam sap CA APP ngay ca khi chua co ai dung tinh nang
  // upload, bat ke check isConfigured() o duoi (check do chi bao ve luc GOI
  // method, khong bao ve field initializer). Getter nay chi thuc su tao
  // S3Client() lan DAU tien co method nao do dung toi `this.client` - moi
  // method nhu vay deu da check isConfigured truoc, nen chua cau hinh AWS
  // thi never chay toi day, app khoi dong binh thuong.
  private _client: S3Client | null = null;
  private get client(): S3Client {
    if (!this._client) {
      this._client = new S3Client({ region: this.region });
    }
    return this._client;
  }

  constructor(private prisma: PrismaService) {}

  get isConfigured() {
    return Boolean(this.bucket && this.region);
  }

  async upload(
    file: Express.Multer.File,
    folder: 'chat-images' | 'chat-files' | 'chat-voice',
  ): Promise<{ url: string; size: number; mimeType: string; name: string }> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình AWS S3 (AWS_REGION/AWS_S3_BUCKET) - tính năng đính kèm chưa hoạt động',
      );
    }

    const key = `${folder}/${randomUUID()}-${file.originalname}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      size: file.size,
      mimeType: file.mimetype,
      name: file.originalname,
    };
  }

  // Huong A: sinh presigned POST policy - client PUT/POST thang len S3,
  // KHONG di qua backend. Dung createPresignedPost (POST policy, ho tro
  // Conditions rang buoc content-length-range + Content-Type CHINH XAC o
  // TANG S3 - xem AWS docs "presigned POST") thay vi presigned PUT don gian
  // (getSignedUrl cho PutObjectCommand) vi PUT don gian KHONG the enforce
  // dieu kien nao ca - client co the doi Content-Length/Content-Type sau khi
  // co URL ky, POST policy thi khong (S3 tu choi neu form field khong khop
  // dieu kien da ky).
  async createPresignedUpload(dto: PresignUploadDto) {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình AWS S3 (AWS_REGION/AWS_S3_BUCKET) - tính năng đính kèm chưa hoạt động',
      );
    }

    if (!ALLOWED_MIME_TYPES[dto.kind].includes(dto.contentType)) {
      throw new BadRequestException(
        `Content-Type "${dto.contentType}" không được phép cho loại "${dto.kind}"`,
      );
    }
    const maxSize = MAX_UPLOAD_SIZE[dto.kind];
    if (dto.fileSize > maxSize) {
      throw new BadRequestException(
        `File vượt quá giới hạn ${Math.round(maxSize / 1024 / 1024)}MB cho loại "${dto.kind}"`,
      );
    }

    const folder = KIND_TO_FOLDER[dto.kind];
    // Loai bo ky tu khong an toan lam S3 key (khoang trang, dau tieng Viet,
    // ky tu dac biet) - GIU LAI ten goc (khong dau) trong metadata rieng
    // neu can hien "ten file that" sau nay, hien tai chua can vi
    // attachmentName da luu rieng trong Message, khong phu thuoc S3 key.
    const safeName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    const key = `${folder}/${randomUUID()}-${safeName}`;

    const { url, fields } = await createPresignedPost(this.client, {
      Bucket: this.bucket!,
      Key: key,
      Conditions: [
        ['content-length-range', 0, maxSize],
        ['eq', '$Content-Type', dto.contentType],
      ],
      Fields: {
        'Content-Type': dto.contentType,
      },
      Expires: PRESIGN_EXPIRY_SECONDS,
    });

    return {
      // Client POST truc tiep len `uploadUrl` voi `fields` + field "file"
      // (multipart/form-data, xem docs/chat-image-upload-architecture.md
      // muc luong FE) - S3 tra 204 neu thanh cong, khong tra ve body huu ich
      // nen `publicUrl` duoi day la URL client dung SAU KHI upload xong de
      // gui kem trong sendMessage (attachmentUrl).
      uploadUrl: url,
      fields,
      key,
      publicUrl: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    };
  }

  private extractKeyFromUrl(url: string): string | null {
    const prefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
  }

  // Quet DE QUY 1 gia tri JSON bat ky (Post.data - khong co type co dinh,
  // moi kind gia (content/image.url/images[].url/video.thumbnailUrl/
  // coverImage - xem post-display.ts o frontend) tim moi string trong Object/
  // Array long nhau - dung thay vi liet ke tung key rieng de KHONG bo sot khi
  // co kind/field moi sau nay (chinh vi liet ke thieu 1 lan truoc day ma bug
  // duoi day xay ra).
  private collectStrings(value: unknown, out: string[]): void {
    if (typeof value === 'string') {
      out.push(value);
    } else if (Array.isArray(value)) {
      for (const v of value) this.collectStrings(v, out);
    } else if (value && typeof value === 'object') {
      for (const v of Object.values(value)) this.collectStrings(v, out);
    }
  }

  // Don rac S3: client co the upload thanh cong len S3 (ca 2 duong) nhung
  // KHONG bao gio goi sendMessage sau do (mat mang/dong tab giua chung) ->
  // object mo coi, khong Message nao tham chieu toi. Chi xoa object CU HON
  // `olderThanMinutes` (mac dinh 60) de khong xoa nham file dang trong luc
  // upload/dang cho client goi sendMessage.
  //
  // QUAN TRONG: kind "image" (KIND_TO_FOLDER o tren) dung CHUNG 1 folder
  // "chat-images" cho MOI noi dung anh trong app (chat, avatar/cover ho so,
  // anh bia bai viet qua Composer.tsx, anh bia bo suu tap qua
  // CreateCollectionModal.tsx - deu goi chung uploadPostImageAction/endpoint
  // nay, xem lich su - endpoint von CHI thiet ke cho chat). Job nay TUNG CHI
  // doi chieu voi Message.attachmentUrl - moi tham chieu khac (avatar/cover ho
  // so, anh bia bai viet trong Post.data JSON, anh bia bo suu tap trong
  // PostCollection.coverImageUrl) KHONG duoc coi la "con tham chieu", bi xoa
  // sau dung 60 phut du dang la anh THAT dang dung (bug that da gap 1 lan voi
  // avatar, gio lap lai voi anh bia bai viet - xem docs/engineering-log.md).
  // Phai doi chieu voi DU CA 5 nguon duoi day, khong chi Message.
  async deleteOrphanedUploads(
    olderThanMinutes = 60,
  ): Promise<{ scanned: number; deleted: number }> {
    if (!this.isConfigured) return { scanned: 0, deleted: 0 };

    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const candidates: string[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: 'chat-',
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of page.Contents ?? []) {
        if (obj.Key && obj.LastModified && obj.LastModified < cutoff) {
          candidates.push(obj.Key);
        }
      }
      continuationToken = page.NextContinuationToken;
    } while (continuationToken);

    if (candidates.length === 0) return { scanned: 0, deleted: 0 };

    // Doi chieu voi DB - key con duoc THAM CHIEU o BAT KY nguon nao duoi day
    // thi GIU LAI: attachmentUrl (Message), avatarUrl (User), coverImageUrl
    // (UserProfile), coverImageUrl (PostCollection), va MOI string long
    // trong Post.data (chua URL anh bia/anh/video-thumbnail tuy kind).
    const [messages, users, profiles, collections, posts] = await Promise.all([
      this.prisma.message.findMany({
        where: { attachmentUrl: { not: null } },
        select: { attachmentUrl: true },
      }),
      this.prisma.user.findMany({
        where: { avatarUrl: { not: null } },
        select: { avatarUrl: true },
      }),
      this.prisma.userProfile.findMany({
        where: { coverImageUrl: { not: null } },
        select: { coverImageUrl: true },
      }),
      this.prisma.postCollection.findMany({
        where: { coverImageUrl: { not: null } },
        select: { coverImageUrl: true },
      }),
      this.prisma.post.findMany({ select: { data: true } }),
    ]);
    const postDataStrings: string[] = [];
    for (const p of posts) this.collectStrings(p.data, postDataStrings);
    const referencedUrls = [
      ...messages.map((m) => m.attachmentUrl),
      ...users.map((u) => u.avatarUrl),
      ...profiles.map((p) => p.coverImageUrl),
      ...collections.map((c) => c.coverImageUrl),
      ...postDataStrings,
    ];
    const referencedKeys = new Set(
      referencedUrls
        .map((url) => (url ? this.extractKeyFromUrl(url) : null))
        .filter((k): k is string => Boolean(k)),
    );

    const toDelete = candidates.filter((k) => !referencedKeys.has(k));
    if (toDelete.length === 0) {
      return { scanned: candidates.length, deleted: 0 };
    }

    // DeleteObjects toi da 1000 key/lan goi - o quy mo hien tai (vai chuc
    // upload) luon duoi nguong; can chia batch 1000 neu san pham lon hon
    // nhieu (xem docs muc "khi nao can nghi lai").
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: toDelete.map((Key) => ({ Key })) },
      }),
    );

    return { scanned: candidates.length, deleted: toDelete.length };
  }

  // Chay moi gio - best-effort, loi khong lam sap app (chi log). Bo qua im
  // lang neu chua cau hinh S3 (dev/test khong co credentials). Nguong 24h
  // (truoc la 60 phut) - bug THAT da gap: user upload anh bia TRUOC (luu S3
  // ngay), roi moi dien ten/mo ta/chu de va bam "Tao" SAU - neu qua trinh do
  // lau hon nguong (vd mo modal roi lam viec khac, quay lai sau), cron chay
  // giua luc do thay object "chua ai tham chieu" (DB chua ghi coverImageUrl
  // vi form chua submit) + "du cu" -> xoa oan, DB sau do luu lai 1 URL da
  // chet vinh vien (xem docs/engineering-log.md 2026-09-11). 60 phut la qua
  // ngan cho hanh vi nguoi dung thuc te; 24h an toan hon nhieu (job nay von
  // chi de don rac, khong gap, tha giu rac lau hon con hon xoa nham).
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOrphanedUploadsJob() {
    if (!this.isConfigured) return;
    try {
      const result = await this.deleteOrphanedUploads(24 * 60);
      if (result.deleted > 0) {
        console.log(
          `[UploadService] don ${result.deleted}/${result.scanned} object S3 mo coi.`,
        );
      }
    } catch (err) {
      console.error('[UploadService] cleanupOrphanedUploadsJob loi:', err);
    }
  }
}
