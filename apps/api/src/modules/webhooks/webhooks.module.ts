import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoWebhookService } from './video-webhook.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [ConfigModule],
  providers: [VideoWebhookService],
  controllers: [WebhooksController],
  exports: [VideoWebhookService],
})
export class WebhooksModule {}
