export function extractBearer(header?: string): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length);
}
// Tách hàm này riêng vì cà JwtAuthGuard và SyncGuard đều cần đọc header Authorization: Bearer <token> theo đúng 1 cách - tránh lặp lại logic parse string ở 2 nơi (nếu sau này đổi forrmat header, chỉ sửa 1 chỗ)
