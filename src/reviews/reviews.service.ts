import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    userId: string,
    bookingId: string,
    rating: number,
    content: string,
  ) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id: bookingId, user_id: userId, status: 'completed' },
      include: {
        class_sessions: { select: { classes: { select: { place_id: true } } } },
      },
    });
    if (!booking)
      throw new ForbiddenException('리뷰를 쓸 수 있는 예약이 아니에요');

    const placeId = booking.class_sessions.classes.place_id;

    try {
      return this.prisma.place_reviews.create({
        data: {
          user_id: userId,
          booking_id: bookingId,
          place_id: placeId,
          rating: rating,
          content: content,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002' || e?.cause?.originalCode === '23505') {
        throw new ConflictException('이미 리뷰를 작성한 예약이에요');
      }
      throw e;
    }
  }

  async getByPlace(placeId: string) {
    return this.prisma.place_reviews.findMany({
      where: { place_id: placeId },
      orderBy: { created_at: 'desc' },
      include: {
        users: { select: { id: true, name: true } },
      },
    });
  }
}
