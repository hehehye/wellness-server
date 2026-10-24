import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // 1) 헤더에서 토큰 꺼내기: "Authorization: Bearer <토큰>"
    const authHeader: string | undefined = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    if (!token) throw new UnauthorizedException('로그인이 필요해요');

    // 2) Supabase에 토큰 검증 요청
    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('유효하지 않은 토큰이에요');
    }

    // 3) 검증된 사용자 정보를 req.user에 저장 (컨트롤러에서 꺼내 씀)
    req.user = { id: data.user.id, email: data.user.email };
    return true;
  }
}
