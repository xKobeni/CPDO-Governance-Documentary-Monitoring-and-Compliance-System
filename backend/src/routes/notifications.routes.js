import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
import { shortCache } from "../middlewares/caching.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  getUnreadHandler,
  getNotificationsHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  getUnreadCountHandler,
} from "../controllers/notifications.controller.js";

const r = Router();

r.use(requireAuth, checkSessionInactivity);

// Get unread notifications
r.get("/unread", shortCache, asyncHandler(getUnreadHandler));

// Get unread count badge
r.get("/unread/count", asyncHandler(getUnreadCountHandler));

// Get all notifications (paginated)
r.get("/", shortCache, asyncHandler(getNotificationsHandler));

// Mark single notification as read
r.patch("/:id/read", asyncHandler(markAsReadHandler));

// Mark all as read
r.patch("/all/read", asyncHandler(markAllAsReadHandler));

export default r;
