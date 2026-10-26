import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PlacesModule } from './places/places.module';
import { Likesmodule } from './likes/likes.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionsModule } from './sessions/sessions.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PlacesModule,
    Likesmodule,
    ScheduleModule.forRoot(),
    SessionsModule,
    BookingsModule,
    ReviewsModule,
  ],
})
export class AppModule {}
