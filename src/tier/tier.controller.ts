import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TierService } from './tier.service';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class TierController {
  constructor(private tierService: TierService) {}

  @Get('categories/:categoryId/tiers')
  findAll(
    @CurrentUserId() userId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.tierService.findAllForCategory(userId, categoryId);
  }

  @Post('categories/:categoryId/tiers')
  create(
    @CurrentUserId() userId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateTierDto,
  ) {
    return this.tierService.create(userId, categoryId, dto);
  }

  @Patch('tiers/:tierId')
  update(
    @CurrentUserId() userId: string,
    @Param('tierId') tierId: string,
    @Body() dto: UpdateTierDto,
  ) {
    return this.tierService.update(userId, tierId, dto);
  }

  @Delete('tiers/:tierId')
  remove(@CurrentUserId() userId: string, @Param('tierId') tierId: string) {
    return this.tierService.remove(userId, tierId);
  }
}
