import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SyncGuard } from '../auth/sync.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { UserService } from './user.service';
import { SyncUserDto } from './dto/sync-user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Public()
  @UseGuards(SyncGuard)
  @Post('sync')
  sync(@Body() dto: SyncUserDto) {
    return this.userService.syncUser(dto);
  }

  // Khong nhan userId tu body - lay tu token da verify (JwtAuthGuard toan
  // cuc), tranh 1 nguoi thu hoi session cua nguoi khac.
  @Post('me/revoke-sessions')
  revokeSessions(@CurrentUserId() userId: string) {
    return this.userService.revokeAllSessions(userId);
  }

  // PHAI khai bao TRUOC @Get(':username') ben duoi - NestJS khop route theo
  // dung THU TU khai bao, ':username' la wildcard se "nuot" luon path
  // "search" neu no dung sau (bi hieu nham la tim profile username="search").
  @Get('search')
  search(
    @CurrentUserId() viewerId: string,
    @Query('q') q: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.search(
      viewerId,
      q ?? '',
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':username')
  getProfile(
    @CurrentUserId() viewerId: string,
    @Param('username') username: string,
  ) {
    return this.userService.getProfileByUsername(viewerId, username);
  }
}
