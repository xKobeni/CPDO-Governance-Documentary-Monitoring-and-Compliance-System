/**
 * Pagination helper for list endpoints
 * Extracts and validates page/limit parameters
 */
export function getPaginationParams(req, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(req.query.page ?? "1", 10));
  const limit = Math.min(
    Math.max(1, parseInt(req.query.limit ?? String(defaultLimit), 10)),
    maxLimit
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Formats paginated response
 */
export function formatPaginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}
