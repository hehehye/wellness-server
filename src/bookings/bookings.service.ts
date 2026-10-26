import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, sessionId: string) {
    const session = await this.prisma.class_sessions.findUnique({
      where: { id: sessionId },
      include: {
        classes: {
          include: { places: { select: { name: true } } },
        },
      },
    });
    if (!session) throw new NotFoundException('회차를 찾을 수 없어요');
    const existing = await this.prisma.bookings.findFirst({
      where: {
        user_id: userId,
        session_id: sessionId,
        status: 'pending',
        hold_expires_at: { gt: new Date() },
      },
    });
    if (existing) return existing;
    const confirmed = await this.prisma.bookings.findFirst({
      // 이미 구매를 완료한 세션은 들어갈수없도록.
      where: { user_id: userId, session_id: sessionId, status: 'confirmed' },
    });
    if (confirmed) throw new ConflictException('이미 예약한 수업이에요');

    return this.prisma.$transaction(async (tx) => {
      // ① 회차 row 잠금: 같은 회차에 동시에 들어온 요청은 여기서 한 줄로 대기
      await tx.$queryRaw`select id from class_sessions where id = ${sessionId}::uuid for update`;

      // ② 내 기존 pending 재사용 / 이미 confirmed 검사 (지금 코드, tx로)

      // ③ 자리가 찬 개수 세기: confirmed + 만료 안 된 pending
      const taken = await tx.bookings.count({
        where: {
          session_id: sessionId,
          OR: [
            { status: 'confirmed' },
            { status: 'pending', hold_expires_at: { gt: new Date() } },
          ],
        },
      });

      // ④ 정원 확인
      if (taken >= session.capacity)
        throw new ConflictException('정원이 마감됐어요');

      // ⑤ 예약 생성 (이 insert가 곧 "자리 차지"예요)
      return tx.bookings.create({
        data: {
          user_id: userId,
          session_id: sessionId,
          status: 'pending',
          hold_expires_at: new Date(Date.now() + 10 * 60 * 1000),

          // 예약 시점 스냅샷
          place_name: session.classes.places.name,
          class_title: session.classes.title,
          start_at: session.start_at,
          end_at: session.end_at,
          price: session.classes.price,
        },
      });
    });
  }
  async getAllByUser(userId: string, q?: string) {
    const bookings = await this.prisma.bookings.findMany({
      where: {
        user_id: userId,
        ...(q && {
          OR: [
            { class_title: { contains: q, mode: 'insensitive' } },
            { place_name: { contains: q, mode: 'insensitive' } },
          ],
        }),
        status: { in: ['confirmed', 'completed', 'cancelled'] },
      },
      orderBy: { created_at: 'desc' },
    });

    return bookings.map(({ ...booking }) => ({
      ...booking,
    }));
  }
  async getOne(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id: bookingId, user_id: userId },
      include: {
        class_sessions: {
          select: { classes: { select: { place_id: true } } },
        },
      },
    });
    if (!booking) throw new NotFoundException('예약을 찾을 수 없어요');
    const review = await this.prisma.place_reviews.findUnique({
      where: { booking_id: bookingId },
      select: { id: true }, // 내용은 필요 X true,false반환필요해서 id만
    });
    return { ...booking, hasReview: !!review };
  }
  async pay(
    userId: string,
    bookingId: string,
    paymentKey: string,
    amount: number,
  ) {
    const booking = await this.prisma.bookings.findFirst({
      where: {
        id: bookingId,
        user_id: userId,
        status: 'pending',
        hold_expires_at: { gt: new Date() },
      },
    });
    if (!booking) throw new NotFoundException('예약을 찾을 수 없어요');
    if (booking.status === 'confirmed') return booking;

    if (
      booking.status !== 'pending' ||
      !booking.hold_expires_at ||
      booking.hold_expires_at <= new Date()
    )
      throw new ConflictException('예약이 만료되었거나 이미 처리된 상태예요');
    // 중요
    if (amount !== Number(booking.price))
      throw new BadRequestException('금액이 틀립니다.');
    const auth =
      'Basic ' +
      Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64');
    const tossRes = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentKey,
          orderId: bookingId,
          amount: Number(booking.price),
        }),
      },
    );
    const toss = await tossRes.json();
    if (!tossRes.ok)
      throw new BadRequestException(toss.message ?? '결제 승인에 실패했어요');
    const { count } = await this.prisma.bookings.updateMany({
      where: { id: bookingId, user_id: userId, status: 'pending' },
      data: {
        status: 'confirmed',
        payment_key: paymentKey,
        payment_method: toss.method,
        paid_at: new Date(),
      },
    });
    if (count === 0) {
      // 돈은 나갔는데 확정 실패 → 결제 취소
      await fetch(
        `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
        {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ cancelReason: '예약 확정 실패' }),
        },
      );
      throw new ConflictException('예약 확정에 실패해 결제를 취소했어요');
    }

    // ⑦ 확정된 예약 반환
    return this.prisma.bookings.findUnique({ where: { id: bookingId } });
    // ① 내 예약 조회 (id + user_id) → 없으면 NotFoundException
    // ② 이미 confirmed면 → 그대로 return booking
    // ③ pending 아니거나 hold_expires_at 지났으면 → ConflictException
    // ④ amount !== Number(booking.price) → BadRequestException
    // ⑤ 토스 승인 API 호출 (실패하면 throw)
    // ⑥ updateMany: where {id, user_id, status:'pending'}
    //    data {status:'confirmed', payment_key, paid_at: new Date()}
    //    count === 0 → 토스 결제 취소 후 ConflictException
    // ⑦ return 확정된 예약
  }
  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.bookings.findFirst({
      where: { id: bookingId, user_id: userId },
    });
    if (!booking) throw new NotFoundException('예약을 찾을 수 없어요');
    const KST_OFFSET = 9 * 60 * 60 * 1000;

    // 수업 시작 시각의 "한국 날짜" (YYYY-MM-DD)
    const kstDateStr = new Date(booking.start_at.getTime() + KST_OFFSET)
      .toISOString()
      .slice(0, 10);

    // 수업 당일 00:00 (KST) = 전날 23:59:59까지 취소 가능
    const deadline = new Date(`${kstDateStr}T00:00:00+09:00`).getTime();

    if (Date.now() >= deadline) {
      throw new ConflictException('예약 취소 가능 시간이 지났습니다.');
    }
    const { count } = await this.prisma.bookings.updateMany({
      where: {
        id: bookingId,
        user_id: userId,
        status: 'confirmed', // 확정된 예약만 취소 가능
      },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(), // 이미 있는 컬럼
      },
    });

    if (count === 0) {
      throw new ConflictException('취소할 수 없는 예약이에요');
    }
    return this.prisma.bookings.findUnique({ where: { id: bookingId } });
  }
}
