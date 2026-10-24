import { Controller, Get } from '@nestjs/common';
import { SessionGeneratorService } from './session-generator.service';

@Controller('dev/sessions')
export class SessionsDevController {
  constructor(private readonly generator: SessionGeneratorService) {}

  @Get('generate')
  generate() {
    return this.generator.generate(7);
  }
}
