import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  POST_COLLECTION_VISIBILITIES,
  type PostCollectionVisibilityApi,
} from '../post-collection-visibility.util';
import {
  POST_COLLECTION_TOPICS,
  type PostCollectionTopicApi,
} from '../post-collection-topic.util';

export class CreateCollectionDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsIn(POST_COLLECTION_VISIBILITIES)
  visibility?: PostCollectionVisibilityApi;

  @IsOptional()
  @IsIn(POST_COLLECTION_TOPICS)
  topic?: PostCollectionTopicApi;
}
