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

  // Ten export cua 1 icon lucide-react (vd "BookOpen") - xem
  // group-icons.tsx o frontend cho danh sach curated hop le.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: 'PUBLIC' | 'PRIVATE';

  // Ten/ma chung chi MUC TIEU cua nhom (vd "AWS Solutions Architect"/"SAA-C03") -
  // sua qua GroupCertSettingsModal.tsx, hien trong GroupProgressWidget.tsx.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  certName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  certCode?: string;

  // "Muc tieu" cua nhom - Tiptap JSON, schema HAN CHE (chi bold/italic/
  // bulletList/orderedList, xem getOverviewExtensions() o frontend) dung
  // chung voi Document.overview. Hien qua modal rieng (GroupGoalModal.tsx),
  // KHONG chung form voi name/description/visibility (EditGroupButton.tsx).
  @IsOptional()
  @IsObject()
  goal?: Record<string, unknown>;
}
