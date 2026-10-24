import { Module } from '@nestjs/common';
import { SessionGeneratorService } from './session-generator.service';
import { SessionsDevController } from './sessions-dev.controller';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsDevController, SessionsController], // 테스트 후 삭제
  providers: [SessionGeneratorService, SessionsService],
})
export class SessionsModule {}
