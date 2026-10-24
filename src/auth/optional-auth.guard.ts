import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  private readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!, // .env의 이름이 SUPABASE_KEY면 그 이름으로 맞추세요
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const authHeader: string | undefined = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    // 토큰이 없으면 비로그인으로 보고 그냥 통과
    if (!token) return true;

    const { data, error } = await this.supabase.auth.getUser(token);

    // 토큰이 틀려도 막지 않고 비로그인으로 처리
    if (!error && data.user) {
      req.user = { id: data.user.id, email: data.user.email };
    }
    return true;
  }
}
