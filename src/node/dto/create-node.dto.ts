import { IsOptional, IsString, IsUUID } from 'class-validator';
export class CreateNodeDto {
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsString()
  title!: string;
}
