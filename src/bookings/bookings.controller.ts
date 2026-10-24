import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { BookingsService } from './bookings.service';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() body: { sessionId: string },
  ) {
    if (!body?.sessionId) throw new BadRequestException('sessionId가 필요해요');
    return this.bookingsService.create(user.id, body.sessionId);
  }

  @UseGuards(AuthGuard)
  @Get()
  getAll(@CurrentUser() user: { id: string }, @Query('q') q?: string) {
    return this.bookingsService.getAllByUser(user.id, q);
  }
  @UseGuards(AuthGuard)
  @Get(':id')
  getOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.bookingsService.getOne(user.id, id);
  }
  @UseGuards(AuthGuard)
  @Post(':id/pay')
  pay(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: { paymentKey: string; amount: number },
  ) {
    return this.bookingsService.pay(user.id, id, body.paymentKey, body.amount);
  }

  @UseGuards(AuthGuard)
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.bookingsService.cancel(user.id, id);
  }
}
