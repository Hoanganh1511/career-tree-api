import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get('workspaces/:workspaceId/categories')
  findAll(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.categoryService.findAllForWorkspace(userId, workspaceId);
  }

  @Post('workspaces/:workspaceId/categories')
  create(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoryService.create(userId, workspaceId, dto);
  }

  @Patch('categories/:categoryId')
  update(
    @CurrentUserId() userId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(userId, categoryId, dto);
  }

  @Delete('categories/:categoryId')
  remove(
    @CurrentUserId() userId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoryService.remove(userId, categoryId);
  }
}
