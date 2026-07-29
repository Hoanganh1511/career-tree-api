import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
}
