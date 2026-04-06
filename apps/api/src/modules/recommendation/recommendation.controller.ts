import { Controller, Post, Body } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { GetRecommendationDto } from './dto/get-recommendation.dto';
import { Public } from '../auth/decorators/roles.decorator';

@Controller('recommendation')
export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  @Public()
  @Post()
  getRecommendation(@Body() dto: GetRecommendationDto) {
    return this.recommendationService.getRecommendation(dto);
  }
}
