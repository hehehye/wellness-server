import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}
  private toUrl(path: string) {
    return `${process.env.SUPABASE_URL}/storage/v1/object/public/place_images/${path}`;
  }
  async getAll(userId: string) {
    const likes = await this.prisma.place_likes.findMany({
      where: { user_id: userId },
      include: {
        places: {
          include: {
            place_images: { orderBy: { sort_order: 'asc' }, take: 1 }, // 대표 1장
          },
        },
      },
      orderBy: { created_at: 'desc' }, // 최근에 찜한 순
    });

    return likes.map((like) => {
      const { place_images, ...place } = like.places;
      return {
        ...place,
        imageUrl: place_images[0]
          ? this.toUrl(place_images[0].storage_path)
          : null,
      };
    });
  }
  async create(userId: string, placeId: string) {
    try {
      return this.prisma.place_likes.create({
        data: { user_id: userId, place_id: placeId },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return;
      }
      throw e;
    }
  }

  async delete(userId: string, placeId: string) {
    return this.prisma.place_likes.deleteMany({
      where: { user_id: userId, place_id: placeId },
    });
  }
}
