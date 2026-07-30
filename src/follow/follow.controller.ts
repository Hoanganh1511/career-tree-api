import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import { CurrentUserId } from 'src/auth/current-user.decorator';

@Controller('follow')
export class FollowController {
  constructor(private followService: FollowService) {}

  @Post(':username')
  follow(@CurrentUserId() userId: string, @Param('username') username: string) {
    return this.followService.followUser(userId, username);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':username')
  unfollow(
    @CurrentUserId() userId: string,
    @Param('username') username: string,
  ) {
    return this.followService.unfollowUser(userId, username);
  }

  @Post('/block/:username')
  block(@CurrentUserId() userId: string, @Param('username') username: string) {
    return this.followService.blockUser(userId, username);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('/block/:username')
  unblock(
    @CurrentUserId() userId: string,
    @Param('username') username: string,
  ) {
    return this.followService.unblockUser(userId, username);
  }

  @Get(':username/following')
  following(
    @CurrentUserId() viewerId: string,
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.followService.getFollowing(
      viewerId,
      username,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':username/followers')
  followers(
    @CurrentUserId() viewerId: string,
    @Param('username') username: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.followService.getFollowers(
      viewerId,
      username,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }
}
