import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PlacesService } from './places.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  getAll(@Query('q') q?: string) {
    return this.placesService.getAll(q);
  }
  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.placesService.getOne(id, user?.id);
  }
}
