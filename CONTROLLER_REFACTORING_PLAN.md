# Controller Response Refactoring Plan

## Summary
Unify all controller responses to use standardized response utilities from `apiResponses.ts`.

## Response Utilities Available

### Success Responses
- `sendSuccess<T>(res, data, message?)` - 200 OK with data
- `sendCreated<T>(res, data, message?)` - 201 Created with data

### Error Responses
- `sendUnauthorized(res, error?)` - 401 Unauthorized
- `sendForbidden(res, error?)` - 403 Forbidden
- `sendNotFound(res, error?)` - 404 Not Found
- `sendBadRequest(res, error?)` - 400 Bad Request
- `sendInternalError(res, error?)` - 500 Internal Server Error
- `sendError(res, statusCode, error)` - Custom status code

## Current State Analysis

### 1. **cityController.ts** (90 lines)
**Current Patterns:**
- ❌ `res.status(200).json({ success: true, data: cities })`
- ❌ `res.status(404).json({ success: false, message: 'City not found' })`
- ❌ `res.status(201).json({ success: true, data: created })`

**Changes Needed:** 5 success responses, 3 error responses

---

### 2. **serviceController.ts** (71 lines)
**Current Patterns:**
- ❌ `res.status(200).json({ success: true, data: services })`
- ❌ `res.status(404); throw new Error('Service not found');`
- ❌ `res.status(201).json({ success: true, data: service })`

**Changes Needed:** 6 success responses, 3 error responses (throw pattern)

---

### 3. **faqController.ts** (68 lines)
**Current Patterns:**
- ❌ `res.status(200).json({ success: true, data: faqs })`
- ❌ `res.status(404); throw new Error('FAQ not found');`
- ❌ `res.status(201).json({ success: true, data: faq })`

**Changes Needed:** 6 success responses, 3 error responses (throw pattern)

---

### 4. **serviceProviderController.ts** (estimated ~70 lines)
**Status:** Needs analysis
**Expected Changes:** Similar to serviceController

---

### 5. **resourceController.ts** (1137 bytes)
**Status:** Needs analysis
**Expected Changes:** Minimal updates

---

### 6. **swepBannerController.ts** (1152 bytes)
**Status:** Needs analysis
**Expected Changes:** Minimal updates

---

### 7. **userController.ts** (8911 bytes)
**Current Status:** ✅ **Partially Updated**
- Already uses `sendNotFound()` in some places
- Mix of old and new patterns

**Remaining Changes:** 
- Replace remaining manual `res.status().json()` calls
- Replace `throw new Error()` patterns with response utilities

---

### 8. **bannerController.ts** (16949 bytes)
**Current Status:** ✅ **Partially Updated**
- Already uses `sendNotFound()` and `sendBadRequest()` in some places
- Mix of old and new patterns

**Remaining Changes:**
- Replace remaining manual `res.status().json()` calls
- Standardize success responses with `sendSuccess()` and `sendCreated()`

---

## Refactoring Strategy

### Phase 1: Update Smaller Controllers (Fastest wins)
1. ✅ **cityController.ts** - Simple CRUD, no complex logic
2. ✅ **faqController.ts** - Simple CRUD
3. ✅ **serviceController.ts** - Simple CRUD
4. ✅ **serviceProviderController.ts** - Simple CRUD
5. ✅ **resourceController.ts** - Minimal code
6. ✅ **swepBannerController.ts** - Minimal code

### Phase 2: Complete Partially Updated Controllers
7. ✅ **userController.ts** - Finish standardization
8. ✅ **bannerController.ts** - Finish standardization

---

## Example Transformations

### Before (Multiple Inconsistent Patterns)
```typescript
// Pattern 1: Direct response
res.status(200).json({ success: true, data: cities });

// Pattern 2: Throw error
res.status(404);
throw new Error('City not found');

// Pattern 3: Inline error
return res.status(404).json({ success: false, message: 'City not found' });

// Pattern 4: Created
res.status(201).json({ success: true, data: created });
```

### After (Unified Pattern)
```typescript
// Success responses
return sendSuccess(res, cities);
return sendCreated(res, created);

// Error responses
return sendNotFound(res, 'City not found');
return sendBadRequest(res, 'Invalid data');
return sendInternalError(res, 'Database error');
```

---

## Benefits

1. **Consistency**: All controllers use the same response pattern
2. **Type Safety**: Generic types ensure proper data typing
3. **Maintainability**: Centralized response logic
4. **Testability**: Easier to mock and test responses
5. **Documentation**: Clear response structure
6. **Error Handling**: Standardized error format across all endpoints

---

## Next Steps (Awaiting Approval)

1. ✅ Review this plan
2. ⏳ Approve refactoring approach
3. ⏳ Update controllers one by one
4. ⏳ Test each controller after updates
5. ⏳ Apply same pattern to Admin project

---

## Estimated Impact

- **Files to Update**: 8 controller files
- **Approximate Changes**: ~80-100 response statements
- **Risk Level**: Low (response format remains compatible)
- **Breaking Changes**: None (JSON structure unchanged)
- **Testing Required**: Verify all endpoints return expected structure
