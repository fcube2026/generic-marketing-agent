-- Enable Row-Level Security on tables created after the initial RLS migration.
--
-- Tables covered:
--   device_tokens          (from 20260415000000_add_push_notifications_sms)
--   notification_preferences (from 20260415000000_add_push_notifications_sms)
--   notification_logs      (from 20260415181920_add_notification_log)
--   pharmacy_partners      (from 20260416000000_add_pharmacy_models)
--   pharmacy_orders        (from 20260416000000_add_pharmacy_models)
--   pharmacy_order_items   (from 20260416000000_add_pharmacy_models)
--   video_sessions         (from 20260416110000_add_video_consultation)
--   _prisma_migrations     (internal Prisma table)

ALTER TABLE "device_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_partners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "video_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "device_tokens" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notification_logs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_partners" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_orders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pharmacy_order_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "video_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" FORCE ROW LEVEL SECURITY;
