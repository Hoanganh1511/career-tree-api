import { PostCollectionTopic } from '../../generated/prisma/client';

// Cung khuon voi post-collection-visibility.util.ts - API dung kebab-case,
// DB luu SCREAMING_SNAKE.
export const POST_COLLECTION_TOPICS = [
  'tech',
  'life',
  'learning',
  'creativity',
  'business',
  'sports',
  'culture',
  'history',
  'other',
] as const;

export type PostCollectionTopicApi = (typeof POST_COLLECTION_TOPICS)[number];

export function toDbTopic(v: string): PostCollectionTopic {
  return v.toUpperCase() as PostCollectionTopic;
}

export function toApiTopic(v: PostCollectionTopic): PostCollectionTopicApi {
  return v.toLowerCase() as PostCollectionTopicApi;
}
