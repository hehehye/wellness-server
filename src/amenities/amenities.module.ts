import { Module } from '@nestjs/common';
import { AmenityService } from './amenities.service';
import { AmenityController } from './amenities.controller';
@Module({
  controllers: [AmenityController],
  providers: [AmenityService],
})
export class AmenityModule {}
