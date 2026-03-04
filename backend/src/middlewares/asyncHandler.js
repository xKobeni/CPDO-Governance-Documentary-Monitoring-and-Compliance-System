/**
 * Async error handler wrapper for Express route handlers
 * Automatically catches unhandled promise rejections and passes to error middleware
 * 
 * Usage:
 *   router.post("/", asyncHandler(myAsyncHandler));
 *   router.get("/:id", asyncHandler(myAsyncHandler));
 */
export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};
