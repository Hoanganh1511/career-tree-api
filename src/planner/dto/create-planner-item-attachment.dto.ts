import { IsOptional, IsUUID } from 'class-validator';

// [2026-10-12] Dinh kem PlannerItem <-> ContentSeries(/Entry) - xem comment
// day du tren model PlannerItemAttachment (schema.prisma). `entryId` vang
// mat = dinh kem CA Series; co gia tri = dinh kem 1 Entry cu the (service
// tu kiem tra entry do THUOC DUNG seriesId da chon, khong tin FE).
export class CreatePlannerItemAttachmentDto {
  @IsUUID()
  seriesId!: string;

  @IsOptional()
  @IsUUID()
  entryId?: string;
}
