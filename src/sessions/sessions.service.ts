import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}
  async getByPlace(placeId: string) {
    const sessions = await this.prisma.class_sessions.findMany({
      where: {
        classes: { place_id: placeId },
        start_at: { gt: new Date() },
      },
      include: {
        classes: { select: { title: true, price: true, duration_min: true } },
      },
      orderBy: { start_at: 'asc' },
    });

    // 위에서 가져온 세션들의 자리 사용량을 한 번에 집계
    const counts = await this.prisma.bookings.groupBy({
      by: ['session_id'],
      where: {
        session_id: { in: sessions.map((s) => s.id) },
        OR: [
          { status: 'confirmed' },
          { status: 'pending', hold_expires_at: { gt: new Date() } },
        ],
      },
      _count: { _all: true },
    });

    // session_id → 개수 로 바꿔 두기
    const takenMap = new Map(counts.map((c) => [c.session_id, c._count._all]));

    return sessions.map((s) => {
      const taken = takenMap.get(s.id) ?? 0;
      return { ...s, taken, remaining: s.capacity - taken };
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
