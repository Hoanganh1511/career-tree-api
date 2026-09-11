import { PostCollectionVisibility } from '../../generated/prisma/client';

// Cung khuon voi post-visibility.util.ts (toDbVisibility/toApiVisibility) -
// API dung lowercase, DB luu SCREAMING_SNAKE.
export const POST_COLLECTION_VISIBILITIES = ['public', 'private'] as const;

export type PostCollectionVisibilityApi =
  (typeof POST_COLLECTION_VISIBILITIES)[number];

export function toDbCollectionVisibility(v: string): PostCollectionVisibility {
  return v.toUpperCase() as PostCollectionVisibility;
}

export function toApiCollectionVisibility(
  v: PostCollectionVisibility,
): PostCollectionVisibilityApi {
  return v.toLowerCase() as PostCollectionVisibilityApi;
}
