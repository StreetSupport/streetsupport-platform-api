# Pagination Response Guide

## Overview
For endpoints that return paginated results, use `sendPaginatedSuccess()` instead of `sendSuccess()`.

---

## Usage

### 1. Import the Helper

```typescript
import { sendPaginatedSuccess, PaginationMeta } from '../utils/apiResponses.js';
```

### 2. Use in Controller

**Before (Manual):**
```typescript
return res.status(200).json({
  success: true,
  data: items,
  pagination: {
    page: Number(page),
    limit: Number(limit),
    total: total,
    pages: Math.ceil(total / Number(limit))
  }
});
```

**After (Using Helper):**
```typescript
return sendPaginatedSuccess(res, items, {
  page: Number(page),
  limit: Number(limit),
  total: total,
  pages: Math.ceil(total / Number(limit))
});
```

---

## Response Format

```typescript
{
  success: true,
  data: T[],              // Your data array
  pagination: {
    page: number,         // Current page
    limit: number,        // Items per page
    total: number,        // Total items count
    pages: number         // Total pages
  },
  message?: string        // Optional message
}
```

---

## Examples

### Example 1: Simple Pagination (Banners)

```typescript
export const getBanners = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  
  const skip = (Number(page) - 1) * Number(limit);
  const banners = await Banner.find().skip(skip).limit(Number(limit));
  const total = await Banner.countDocuments();
  
  return sendPaginatedSuccess(res, banners, {
    page: Number(page),
    limit: Number(limit),
    total: total,
    pages: Math.ceil(total / Number(limit))
  });
});
```

### Example 2: Pagination with Filtering (Users)

```typescript
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, page = 1, limit = 10 } = req.query;
  
  const query: any = {};
  if (search) {
    query.$or = [
      { Email: new RegExp(search as string, 'i') },
      { UserName: new RegExp(search as string, 'i') }
    ];
  }
  
  const skip = (Number(page) - 1) * Number(limit);
  const users = await User.find(query).skip(skip).limit(Number(limit));
  const total = await User.countDocuments(query);
  
  return sendPaginatedSuccess(res, users, {
    page: Number(page),
    limit: Number(limit),
    total: total,
    pages: Math.ceil(total / Number(limit))
  });
});
```

### Example 3: Pagination with Message

```typescript
export const getFilteredItems = asyncHandler(async (req: Request, res: Response) => {
  // ... query logic
  
  return sendPaginatedSuccess(res, items, {
    page: Number(page),
    limit: Number(limit),
    total: total,
    pages: Math.ceil(total / Number(limit))
  }, `Found ${total} items`);  // Optional message
});
```

---

## When to Use

### ✅ Use `sendPaginatedSuccess` for:
- List endpoints with pagination (GET /api/users, GET /api/banners)
- Search results with pagination
- Filtered lists that support paging

### ✅ Use `sendSuccess` for:
- Single item responses (GET /api/users/:id)
- Complete lists without pagination (GET /api/cities)
- Actions that don't return lists (POST, PUT, DELETE)
- Endpoints with custom response structures

---

## Pagination Metadata Interface

```typescript
export interface PaginationMeta {
  page: number;      // Current page (1-based)
  limit: number;     // Items per page
  total: number;     // Total number of items
  pages: number;     // Total number of pages
}
```

---

## Updated Controllers

### ✅ Already Using `sendPaginatedSuccess`:
1. **bannerController.ts** - `getBanners()`
2. **userController.ts** - `getUsers()`

### Standard Responses (No Pagination):
- All other endpoints use `sendSuccess()`, `sendCreated()`, etc.

---

## TypeScript Benefits

The helper is fully type-safe:

```typescript
// Type-safe data
const users: User[] = await User.find();
return sendPaginatedSuccess<User[]>(res, users, pagination);

// Type inference works automatically
return sendPaginatedSuccess(res, banners, pagination);  // banners type inferred
```

---

## Notes

1. **Pagination is optional** - Only use when needed
2. **Consistent format** - Always include all 4 fields (page, limit, total, pages)
3. **Calculate pages** - Always use `Math.ceil(total / limit)` for total pages
4. **1-based indexing** - Pages start at 1, not 0
5. **Type safety** - Use generic type parameter for better IntelliSense

---

## Migration Checklist

If you have an existing paginated endpoint:

- [ ] Import `sendPaginatedSuccess` from `../utils/apiResponses.js`
- [ ] Replace manual `res.status(200).json({...})` with `sendPaginatedSuccess()`
- [ ] Ensure pagination object has all 4 required fields
- [ ] Add `return` statement if not already present
- [ ] Test the endpoint to verify response format
