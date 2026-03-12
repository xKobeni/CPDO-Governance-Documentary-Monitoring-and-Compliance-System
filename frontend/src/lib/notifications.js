import {
  AlertTriangle,
  CheckCircle2,
  FilePen,
  FileText,
  Info,
  XCircle,
} from 'lucide-react';

export const NOTIFICATION_TYPE_CONFIG = {
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle2,
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
  },
  DENIED: {
    label: 'Denied',
    icon: XCircle,
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
  },
  REVISION_REQUESTED: {
    label: 'Revision Requested',
    icon: FilePen,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  SUBMISSION_RECEIVED: {
    label: 'Submission Received',
    icon: FileText,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  DEADLINE_REMINDER: {
    label: 'Deadline Reminder',
    icon: AlertTriangle,
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  SYSTEM: {
    label: 'System',
    icon: Info,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const ALL_NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_CONFIG);

export function getNotificationTypeConfig(type) {
  return NOTIFICATION_TYPE_CONFIG[type] ?? NOTIFICATION_TYPE_CONFIG.SYSTEM;
}

export function formatNotificationRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatNotificationDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}