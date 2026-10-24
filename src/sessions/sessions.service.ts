import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}
  async getByPlace(placeId: string) {
    return this.prisma.class_sessions.findMany({
      where: {
        classes: { place_id: placeId }, // 회차의 과목(classes)이 이 가게 소속인 것
        start_at: { gt: new Date() }, // 앞으로의 회차만
      },
      include: {
        classes: { select: { title: true, price: true, duration_min: true } },
      },
      orderBy: { start_at: 'asc' },
    });
  }
  async getOne(sessionId: string) {
    const session = await this.prisma.class_sessions.findUnique({
      where: { id: sessionId },
      include: {
        classes: {
          select: {
            title: true,
            price: true,
            duration_min: true,
            place_id: true,
            places: {
              select: {
                id: true,
                name: true,
                address: true,
                lat: true,
                lng: true,
              },
            },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('회차를 찾을 수 없어요');
    const taken = await this.prisma.bookings.count({
      where: {
        session_id: sessionId,
        OR: [
          { status: 'confirmed' },
          { status: 'pending', hold_expires_at: { gt: new Date() } },
        ],
      },
    });

    return { ...session, taken, remaining: session.capacity - taken };
  }
}
