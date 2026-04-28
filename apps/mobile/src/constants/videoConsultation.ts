import { Colors } from './colors';
import { VideoSessionStatus } from '../types';

export const SESSION_STATUS_LABEL: Record<VideoSessionStatus, string> = {
  CREATED: '🕐 Session Created',
  WAITING: '⏳ Waiting for Provider',
  IN_PROGRESS: '🔴 Live',
  COMPLETED: '✅ Completed',
  FAILED: '❌ Failed',
  EXPIRED: '⌛ Expired',
};

export const SESSION_STATUS_COLOR: Record<VideoSessionStatus, string> = {
  CREATED: Colors.textMuted,
  WAITING: '#F59E0B',
  IN_PROGRESS: Colors.error,
  COMPLETED: Colors.success,
  FAILED: Colors.error,
  EXPIRED: Colors.textMuted,
};
