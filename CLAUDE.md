# career-tree-api

Backend cho sản phẩm **career-tree** (frontend: repo `enggo`, Next.js).
FE gọi vào đây qua `enggo/src/lib/api` + server actions trong `enggo/src/actions`.

## Stack
- NestJS 11 (module-based), TypeScript
- Prisma 7 + PostgreSQL (adapter `@prisma/adapter-pg`)
- Auth: JWT (`@nestjs/jwt`) — xem `src/auth`

## Cấu trúc
- Mỗi domain là 1 module: `node`, `card`, `issue`, `resource`,
  `notification`, `workspace`, `user`, `auth`.
- Mẫu chuẩn 1 module: `*.module.ts` + `*.controller.ts` + `*.service.ts` + `dto/`.
- `common/ownership.service.ts`: kiểm tra quyền sở hữu resource theo user.
- `prisma/prisma.service.ts`: client dùng chung; luôn inject, không tạo mới.

## Lệnh (pnpm)
- Dev:        `pnpm start:dev`      (watch)
- Build:      `pnpm build`
- Lint:       `pnpm lint`           (eslint --fix)
- Format:     `pnpm format`         (prettier)
- Test:       `pnpm test` / `pnpm test:cov` / `pnpm test:e2e`

## Prisma workflow (landmine)
- Sửa schema tại `prisma/schema.prisma`.
- Tạo migration: `pnpm prisma migrate dev --name <ten>`.
- KHÔNG sửa file trong `prisma/migrations/` đã tạo.
- Client generate vào `generated/prisma` (đã .gitignore) — chạy `prisma generate` sau khi đổi schema.
- Seed: `prisma/seed.ts`, `prisma/seed-swe.ts`.

## Quy ước
- DTO validate bằng `class-validator` + `class-transformer`.
- Bảo vệ route bằng guard trong `src/auth` (`jwt-auth.guard`, `sync.guard`);
  route public đánh dấu bằng `@Public()`.
- Lấy user hiện tại qua decorator `@CurrentUser()`.
