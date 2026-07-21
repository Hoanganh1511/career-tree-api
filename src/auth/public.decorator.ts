import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
// SetMetadata là cơ chế của NestJS để "gắn nhãn" (metadata) lên 1 class hoặc method bằng decorator, dùng `reflect-metadata` bên dưới
// (dữ liệu này không tồn tại lúc runtime bình thường của JS - TS decorator + `reflect-metadata` polyfill mới cho phép đọc lại được)

// @Public() khi gắn lên 1 route handler (POST/user/sync) không tự động làm route đó bỏ qua guard - nó chỉ gắn 1 "cờ" isPublic = true vào metadata của route đó.
// JwtAuthGuard là bên chủ động đọc cờ này và quyết định bỏ qua check. nếu không có JwtAuthGuard đọc IS_PUBLIC_KEY, decorator @Public() sẽ vô nghĩa
