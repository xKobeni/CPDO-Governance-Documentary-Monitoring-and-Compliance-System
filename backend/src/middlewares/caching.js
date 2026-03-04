/**
 * Cache control middleware for GET endpoints
 * Sets appropriate cache headers for browser and CDN caching
 */
export function cacheControl(maxAge = 300) {
  return (req, res, next) => {
    // Cache read-only GET requests
    if (req.method === "GET") {
      res.set("Cache-Control", `public, max-age=${maxAge}`);
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
