export function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role; // ADMIN / STAFF / OFFICE
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}