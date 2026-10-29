import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PlacesService } from './places.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  getAll(
    @Query('q') q?: string,
    @Query('category') category?: string[],
    @Query('amenity') amenity?: string[],
  ) {
    const categories = category
      ? [category].flat().flatMap((c) => c.split(','))
      : undefined;
    const amenities = amenity
      ? [amenity].flat().flatMap((c) => c.split(','))
      : undefined;
    return this.placesService.getAll(q, categories, amenities);
  }
  @UseGuards(OptionalAuthGuard)
  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.placesService.getOne(id, user?.id);
  }
}
