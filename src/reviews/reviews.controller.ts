import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get(':id')
  getByPlace(@Param('id') id: string) {
    return this.reviewsService.getByPlace(id);
  }
  @UseGuards(AuthGuard)
  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() body: { bookingId: string; rating: number; content: string },
  ) {
    return this.reviewsService.create(
      user.id,
      body.bookingId,
      body.rating,
      body.content,
    );
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  delete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.reviewsService.delete(user.id, id);
  }
}
