import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateKnowledgeGroupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';

  // "Muc tieu" cua nhom - Tiptap JSON, schema HAN CHE (chi bold/italic/
  // bulletList/orderedList, xem getOverviewExtensions() o frontend) dung
  // chung voi Document.overview. Hien qua modal rieng (GroupGoalModal.tsx),
  // KHONG chung form voi name/description/visibility (EditGroupButton.tsx).
  @IsOptional()
  @IsObject()
  goal?: Record<string, unknown>;
}
