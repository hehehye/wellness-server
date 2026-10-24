import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @UseGuards(AuthGuard)
  @Get()
  getAll(@CurrentUser() user: { id: string }) {
    return this.likesService.getAll(user.id);
  }
  @UseGuards(AuthGuard)
  @Post(':id/like')
  create(@Param('id') placeId: string, @CurrentUser() user: { id: string }) {
    return this.likesService.create(user.id, placeId);
  }
  @UseGuards(AuthGuard)
  @Delete(':id/like')
  delete(@Param('id') placeId: string, @CurrentUser() user: { id: string }) {
    return this.likesService.delete(user.id, placeId);
  }
}
