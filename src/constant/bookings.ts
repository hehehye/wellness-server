export type BookingStatus =
  'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';
// 예약의 상태 전이 규칙표
export const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'expired'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
};

