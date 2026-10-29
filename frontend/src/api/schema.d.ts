/**
 * TỆP NÀY ĐƯỢC SINH TỰ ĐỘNG – KHÔNG SỬA TAY.
 *
 * Sinh lại bằng lệnh (backend phải đang chạy):
 *   npm run gen:api
 * tương đương:
 *   openapi-typescript http://localhost:8080/api/v1/v3/api-docs -o src/api/schema.d.ts
 *
 * Hiện tại là placeholder; type domain tạm khai báo tay trong src/types/domain.ts.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface paths {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface components {
  schemas: Record<string, never>;
}
