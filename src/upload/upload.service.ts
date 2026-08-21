import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// Upload that cho anh/file/ghi am trong chat - can 4 bien moi trrong .env:
// AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (2 bien
// sau S3Client tu doc qua default credential provider chain, khong truyen
// thang vao constructor). Bucket can bat public read qua BUCKET POLICY (khong
// phai object ACL - AWS chan ACL public tren bucket moi theo mac dinh) vi FE
// hien anh/audio truc tiep tu URL tra ve, khong dung presigned GET.
@Injectable()
export class UploadService {
  private bucket = process.env.AWS_S3_BUCKET;
  private region = process.env.AWS_REGION;
  private client = new S3Client({ region: this.region });

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
}
