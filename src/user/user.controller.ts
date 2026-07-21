import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SyncGuard } from '../auth/sync.guard';
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
}
