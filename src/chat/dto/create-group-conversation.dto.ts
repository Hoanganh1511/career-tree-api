import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

// Chua co upload anh that (khong co UI/luu tru cho avatar nhom) - cho nguoi
// tao chon 1 trong so mau nen CO DINH nay thay vi anh that, luu lai luon
// cho nhom (khong doi ngau nhien moi lan render). Value la 1 KEY, khong
// phai CSS - map sang gradient that o frontend (xem GroupAvatar.tsx).
export const GROUP_AVATAR_COLORS = [
  'violet',
  'blue',
  'emerald',
  'amber',
  'rose',
  'slate',
] as const;
export type GroupAvatarColor = (typeof GROUP_AVATAR_COLORS)[number];

export class CreateGroupConversationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @IsIn(GROUP_AVATAR_COLORS)
  avatarColor!: GroupAvatarColor;

  // Nguoi tao TU DONG la thanh vien, khong can truyen chinh minh vao day -
  // toi thieu 2 nguoi khac de tong participants >= 3 (2 nguoi thi da la 1-1
  // roi, khong goi la "nhom").
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(255)
  @ArrayUnique()
  @IsString({ each: true })
  memberIds!: string[];
}
