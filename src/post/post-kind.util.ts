import { PostKind } from '../../generated/prisma/client';

// Danh sach 24 "kind" bai dang, dang kebab-case - day la vocabulary CHUNG voi
// frontend (enggo/src/content/home-feed-mock.ts Post["kind"] union). DB luu
// SCREAMING_SNAKE (dung convention enum cua repo, xem schema.prisma), nhung
// API tra ve/nhan vao dung kebab-case de frontend khong phai tu chuyen doi -
// 2 ham duoi day la noi DUY NHAT lam viec chuyen doi nay.
export const POST_KINDS = [
  'text',
  'image',
  'gallery',
  'video',
  'file',
  'link',
  'resource',
  'note',
  'project-update',
  'achievement',
  'milestone',
  'question',
  'poll',
  'career-update',
  'skill-update',
  'node-created',
  'knowledge-block',
  'timeline-event',
  'code-snippet',
  'idea',
  'tutorial',
  'experiment',
  'event',
  'skill-report',
] as const;

export type PostKindApi = (typeof POST_KINDS)[number];

export function toDbKind(kind: string): PostKind {
  return kind.toUpperCase().replace(/-/g, '_') as PostKind;
}

export function toApiKind(kind: PostKind): PostKindApi {
  return kind.toLowerCase().replace(/_/g, '-') as PostKindApi;
}
