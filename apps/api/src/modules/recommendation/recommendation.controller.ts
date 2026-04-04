import { Controller, Post, Body } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { GetRecommendationDto } from './dto/get-recommendation.dto';

@Controller('recommendation')
export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  @Post()
  getRecommendation(@Body() dto: GetRecommendationDto) {
    return this.recommendationService.getRecommendation(dto);
  }
}
