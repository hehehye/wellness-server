import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { isoDow, kstDate, timeStr } from '../common/date';

const MIN_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionGeneratorService {
  private readonly logger = new Logger(SessionGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. confirmed(결제완료, 이용전) -> completed (이용완료). 기준은 end_at 수업이 끝난시간 기준부터 확인
  @Cron('*/30 * * * *')
  async completeFinished() {
    const { count } = await this.prisma.bookings.updateMany({
      where: { status: 'confirmed', end_at: { lte: new Date() } },
      data: { status: 'completed' },
    });
    if (count > 0) this.logger.log(`이용 완료 처리: ${count}건`);
  }
  // 매일 새벽 3시(한국 시간)마다 새로운 세션을추가, 기존에있는 중복은 추가X
  @Cron('40 1 * * *', { timeZone: 'Asia/Seoul' })
  async handleCron() {
    await this.generate(7);
  }

  /** 오늘부터 days일 치 회차를 만든다 (이미 있는 회차는 건너뜀) */
  async generate(days = 7) {
    const schedules = await this.prisma.class_schedules.findMany({
      include: { classes: true }, // 관계 필드 이름이 다르면 자동완성으로 확인
    });

    const rows: Prisma.class_sessionsCreateManyInput[] = [];

    for (let i = 0; i < days; i++) {
      const dateStr = kstDate(i);
      const dow = isoDow(dateStr);

      for (const s of schedules) {
        if (s.day_of_week !== dow) continue;
        if (!s.classes.is_active) continue;

        // 규칙의 유효 기간 검사
        const from = s.valid_from.toISOString().slice(0, 10);
        const until = s.valid_until?.toISOString().slice(0, 10) ?? null;
        if (dateStr < from) continue;
        if (until && dateStr > until) continue;

        const startAt = new Date(`${dateStr}T${timeStr(s.start_time)}+09:00`);
        const endAt = new Date(
          startAt.getTime() + s.classes.duration_min * MIN_MS,
        );
        // 수업 날짜 2일 전 00:00 (KST)
        const opensAt = new Date(
          new Date(`${dateStr}T00:00:00+09:00`).getTime() - 2 * DAY_MS,
        );

        rows.push({
          class_id: s.class_id,
          start_at: startAt,
          end_at: endAt,
          capacity: s.classes.capacity,
          booking_opens_at: opensAt,
        });
      }
    }

    const result = await this.prisma.class_sessions.createMany({
      data: rows,
      skipDuplicates: true, // (class_id, start_at) 유니크 충돌은 건너뜀
    });

    this.logger.log(`회차 생성: 후보 ${rows.length}개, 신규 ${result.count}개`);
    return result;
  }
}
