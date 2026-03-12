/**
 * Cache control middleware for GET endpoints
 * Sets appropriate cache headers for browser and CDN caching
 */
export function cacheControl(maxAge = 300) {
  return (req, res, next) => {
    // Cache read-only GET requests
    if (req.method === "GET") {
      // IMPORTANT:
      // Most API responses here are user-scoped (auth required). Marking them "public"
      // can allow shared caches/proxies to store and serve one user's data to another.
      // "private" permits browser caching but tells shared caches not to reuse it.
      res.set("Cache-Control", `private, max-age=${maxAge}`);
      // Ensure any intermediate caches separate variants by auth/session context.
      res.vary("Authorization");
      res.vary("Cookie");
      res.vary("x-session-id");
    } else {
      // Don't cache POST/PATCH/DELETE
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    }
    next();
  };
}

/**
 * Short cache for data that changes frequently (submissions, reviews)
 * 30 seconds
 */
export const shortCache = cacheControl(30);

/**
 * Medium cache for semi-static data (templates, users)
 * 5 minutes
 */
export const mediumCache = cacheControl(300);

/**
 * Long cache for static data (governance areas, roles)
 * 1 hour
 */
export const longCache = cacheControl(3600);
