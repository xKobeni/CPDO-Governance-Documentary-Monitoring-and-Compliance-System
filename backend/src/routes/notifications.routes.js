import { Router } from "express";
import { requireAuth, checkSessionInactivity } from "../middlewares/auth.js";
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
r.get("/unread", asyncHandler(getUnreadHandler));

// Get unread count badge
r.get("/unread/count", asyncHandler(getUnreadCountHandler));

// Get all notifications (paginated)
r.get("/", asyncHandler(getNotificationsHandler));

// Mark all as read
r.patch("/all/read", asyncHandler(markAllAsReadHandler));

// Mark single notification as read
r.patch("/:id/read", asyncHandler(markAsReadHandler));

export default r;
