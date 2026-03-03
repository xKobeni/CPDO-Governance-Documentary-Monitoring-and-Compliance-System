import { nanoid } from "nanoid";

export function setCsrfCookie(res, opts = {}) {
  const token = nanoid(32);
  res.cookie("csrf_token", token, {
    httpOnly: false,
    sameSite: "strict",
    secure: opts.secure ?? false,
    path: "/",
  });
  return token;
}

export function requireCsrf(req, res, next) {
  const cookie = req.cookies?.csrf_token;
  const header = req.headers["x-csrf-token"];
  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ message: "CSRF check failed" });
  }
  next();
}