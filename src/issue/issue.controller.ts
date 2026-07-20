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

@Controller()
export class IssueController {
  constructor(private issueService: IssueService) {}

  @Get('nodes/:nodeId/issues')
  findAll(@Param('nodeId') nodeId: string) {
    return this.issueService.findAllForNode(nodeId);
  }

  @Post('nodes/:nodeId/issues')
  create(@Param('nodeId') nodeId: string, @Body() dto: CreateIssueDto) {
    return this.issueService.create(nodeId, dto);
  }

  @Patch('issues/:issueId')
  update(@Param('issueId') issueId: string, @Body() dto: UpdateIssueDto) {
    return this.issueService.update(issueId, dto);
  }

  @Delete('issues/:issueId')
  remove(@Param('issueId') issueId: string) {
    return this.issueService.remove(issueId);
  }
}
