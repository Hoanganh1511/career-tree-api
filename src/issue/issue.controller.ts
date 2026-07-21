import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IssueService } from './issue.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class IssueController {
  constructor(private issueService: IssueService) {}

  @Get('nodes/:nodeId/issues')
  findAll(@CurrentUserId() userId: string, @Param('nodeId') nodeId: string) {
    return this.issueService.findAllForNode(userId, nodeId);
  }

  @Post('nodes/:nodeId/issues')
  create(
    @CurrentUserId() userId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.issueService.create(userId, nodeId, dto);
  }

  @Patch('issues/:issueId')
  update(
    @CurrentUserId() userId: string,
    @Param('issueId') issueId: string,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.issueService.update(userId, issueId, dto);
  }

  @Delete('issues/:issueId')
  remove(@CurrentUserId() userId: string, @Param('issueId') issueId: string) {
    return this.issueService.remove(userId, issueId);
  }
}
