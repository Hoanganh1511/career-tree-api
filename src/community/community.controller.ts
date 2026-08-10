import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { CurrentUserId } from 'src/auth/current-user.decorator';

@Controller('communities')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.communityService.listPublic(userId);
  }

  @Get(':slug')
  async findBySlug(
    @CurrentUserId() userId: string,
    @Param('slug') slug: string,
  ) {
    const community = await this.communityService.findBySlug(userId, slug);
    if (!community) throw new NotFoundException();
    return community;
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateCommunityDto) {
    return this.communityService.create(userId, dto);
  }
}
