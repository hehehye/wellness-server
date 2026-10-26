import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}
  private toUrl(path: string) {
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/place_images/${path}`;
  }

  /** 장소 목록 (최신순) */
  async getAll(q?: string) {
    const places = await this.prisma.places.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { category: { contains: q, mode: 'insensitive' } },
              { address: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { created_at: 'desc' },
      include: {
        place_images: { orderBy: { sort_order: 'asc' }, take: 1 }, // 대표 1장
      },
    });

    return places.map(({ place_images, ...place }) => ({
      ...place,
      imageUrl: place_images[0]
        ? this.toUrl(place_images[0].storage_path)
        : null,
    }));
  }

  async getOne(id: string, userId?: string) {
    const [place, like] = await Promise.all([
      this.prisma.places.findUnique({
        where: { id },
        include: {
          place_images: { orderBy: { sort_order: 'asc' } }, // ← 안쪽 include 제거
          _count: { select: { place_reviews: true } },
        },
      }),
      userId
        ? this.prisma.place_likes.findFirst({
            where: { place_id: id, user_id: userId },
          })
        : null,
    ]);

    if (!place) throw new NotFoundException('장소를 찾을 수 없어요');

    const { place_images, ...rest } = place;
    const images = place_images.map((img) => this.toUrl(img.storage_path));
    return { ...rest, images, imageUrl: images[0] ?? null, isLiked: !!like };
  }
}
