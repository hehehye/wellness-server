import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AmenityService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.amenities.findMany({
      orderBy: { created_at: 'desc' },
    });
  }
}
