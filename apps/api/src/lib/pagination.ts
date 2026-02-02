import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type Pagination = z.infer<typeof paginationQuerySchema>;

export function offsetLimit(p: Pagination): { offset: number; limit: number } {
  const limit = p.pageSize;
  const offset = (p.page - 1) * p.pageSize;
  return { offset, limit };
}
