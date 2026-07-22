import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { NodeKind } from '../../../generated/prisma/client';
export class CreateNodeDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsString()
  title!: string;

  @IsOptional()
  @IsEnum(NodeKind)
  kind?: NodeKind;
}
