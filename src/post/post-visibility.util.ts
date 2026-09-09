import { PostVisibility } from '../../generated/prisma/client';

// Cung khuon voi post-kind.util.ts (toDbKind/toApiKind) - API dung
// kebab-case (thuc ra khong co dau "-" o 3 gia tri nay nen chi la
// lowercase), DB luu SCREAMING_SNAKE dung convention enum cua repo.
export const POST_VISIBILITIES = ['draft', 'public', 'limited'] as const;

export type PostVisibilityApi = (typeof POST_VISIBILITIES)[number];

export function toDbVisibility(v: string): PostVisibility {
  return v.toUpperCase() as PostVisibility;
}

export function toApiVisibility(v: PostVisibility): PostVisibilityApi {
  return v.toLowerCase() as PostVisibilityApi;
}
