// Phai KHOP voi enggo/src/lib/api/sign-internal-token.ts. Ca 2 loai token
// deu ky bang cung 1 INTERNAL_API_SECRET nen `aud` la thu duy nhat phan biet
// chung - thieu no thi token sync co the lot qua guard cua API va nguoc lai.
export const TOKEN_ISSUER = 'enggo-web';
export const AUDIENCE_API = 'career-tree-api';
export const AUDIENCE_SYNC = 'career-tree-api/sync';
// Token rieng cho ket noi WebSocket (NotificationGateway) - khac AUDIENCE_API
// vi socket duoc trinh duyet ket noi TRUC TIEP (khong qua Next.js server nhu
// apiFetch), token nay se nam trong tay client lau hon 1 request thuong.
export const AUDIENCE_SOCKET = 'career-tree-api/socket';
