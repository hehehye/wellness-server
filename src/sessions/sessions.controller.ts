import { Controller, Get, Param, Query } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  getByPlace(@Query('placeId') placeId: string) {
    return this.sessionsService.getByPlace(placeId);
  }
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.sessionsService.getOne(id);
  }
}
