import { CommunityPostCategory } from '../../generated/prisma/client';
export function toDbCategory(category: string): CommunityPostCategory {
  return category.toUpperCase() as CommunityPostCategory;
}

export function toApiCategory(
  category: CommunityPostCategory,
): 'learning' | 'question' | 'resource' {
  return category.toLowerCase() as 'learning' | 'question' | 'resource';
}
