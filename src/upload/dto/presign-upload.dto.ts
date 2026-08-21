import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const UPLOAD_KINDS = ['image', 'file', 'voice'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

// Content-Type cho phep theo tung kind - enforce CA o day (400 som, UX ro
// rang) LAN trong dieu kien cua presigned POST policy (chan thuc su o tang
// S3, xem UploadService.createPresignedUpload) - khong chi validate o FE.
export const ALLOWED_MIME_TYPES: Record<UploadKind, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  file: [
    'application/pdf',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  voice: ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'],
};

// Gioi han rieng tung kind (bytes) - anh/voice nho hon file dinh kem thong
// thuong, tranh 1 gioi han 25MB dung chung qua rong cho anh/voice nhu truoc.
export const MAX_UPLOAD_SIZE: Record<UploadKind, number> = {
  image: 10 * 1024 * 1024, // 10MB
  file: 25 * 1024 * 1024, // 25MB
  voice: 15 * 1024 * 1024, // 15MB
};

export class PresignUploadDto {
  @IsIn(UPLOAD_KINDS)
  kind!: UploadKind;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contentType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  // Client tu bao truoc kich thuoc that (dung de chon dung gioi han trong
  // policy) - S3 VAN tu chan neu client noi doi (content-length-range trong
  // Conditions cua presigned POST, xem UploadService), day chi la validate
  // som + chon dieu kien phu hop.
  @IsInt()
  @Min(1)
  @Max(25 * 1024 * 1024)
  fileSize!: number;
}
