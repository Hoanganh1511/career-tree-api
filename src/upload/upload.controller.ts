import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService, KIND_TO_FOLDER } from './upload.service';
import {
  PresignUploadDto,
  UPLOAD_KINDS,
  UploadKind,
} from './dto/presign-upload.dto';

@Controller('uploads')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  // Huong cu (proxy qua backend) - VAN la duong FE dang dung that su hom
  // nay, giu nguyen. Xem POST /uploads/presign de biet duong moi (Huong A).
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file');
    }
    if (!kind || !UPLOAD_KINDS.includes(kind as UploadKind)) {
      throw new BadRequestException('kind phải là image, file hoặc voice');
    }
    return this.uploadService.upload(
      file,
      KIND_TO_FOLDER[kind as UploadKind] as
        'chat-images' | 'chat-files' | 'chat-voice',
    );
  }

  // Huong A (khuyen nghi) - sinh presigned POST policy, client upload
  // THANG len S3 bang ket qua tra ve, khong di qua backend. Xem
  // UploadService.createPresignedUpload() +
  // docs/chat-image-upload-architecture.md.
  @Post('presign')
  presign(@Body() dto: PresignUploadDto) {
    return this.uploadService.createPresignedUpload(dto);
  }
}
