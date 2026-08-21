import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Query cho GET /conversations/:id/messages/:messageId/context - "nhay toi"
// 1 tin nhan tu ket qua tim kiem (co the nam ngoai trang messages dang tai
// trong khung chat) - xem ChatSearchService.getMessageContext().
export class MessageContextQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  before?: number = 15;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  after?: number = 15;
}
