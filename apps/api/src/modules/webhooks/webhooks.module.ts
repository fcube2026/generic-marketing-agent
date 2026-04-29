import { Module } from '@nestjs/common';
import { VideoWebhookService } from './video-webhook.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  providers: [VideoWebhookService],
  controllers: [WebhooksController],
  exports: [VideoWebhookService],
})
export class WebhooksModule {}
