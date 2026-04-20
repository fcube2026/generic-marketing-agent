import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { MarketingService } from './marketing.service';
import {
  UpsertBusinessProfileDto,
  UpsertCampaignDto,
  UpdateCampaignDto,
  UpsertExperimentDto,
  UpdateExperimentDto,
  UpsertContentItemDto,
  UpdateContentItemDto,
  UpsertSeoPageDto,
  UpsertKeywordClusterDto,
  UpsertLifecycleFlowDto,
  UpsertPlanItemDto,
  UpdatePlanItemDto,
  UpsertIntakeResponseDto,
} from './dto/marketing.dto';

@ApiTags('marketing')
@ApiBearerAuth()
@Roles('ADMIN', 'MARKETING_AGENT')
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  // ─── Profile ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get the marketing business profile' })
  @Get('profile')
  getProfile() {
    return this.marketing.getProfile();
  }

  @ApiOperation({ summary: 'Create or update the marketing business profile' })
  @Put('profile')
  updateProfile(@Body() dto: UpsertBusinessProfileDto) {
    return this.marketing.upsertProfile(dto);
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all marketing campaigns' })
  @Get('campaigns')
  listCampaigns() {
    return this.marketing.listCampaigns();
  }

  @ApiOperation({ summary: 'Create a marketing campaign' })
  @Post('campaigns')
  createCampaign(@Body() dto: UpsertCampaignDto) {
    return this.marketing.createCampaign(dto);
  }

  @ApiOperation({ summary: 'Update a marketing campaign' })
  @Put('campaigns/:id')
  updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.marketing.updateCampaign(id, dto);
  }

  @ApiOperation({ summary: 'Delete a marketing campaign' })
  @Delete('campaigns/:id')
  deleteCampaign(@Param('id') id: string) {
    return this.marketing.deleteCampaign(id);
  }

  // ─── Experiments ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List all marketing experiments' })
  @Get('experiments')
  listExperiments() {
    return this.marketing.listExperiments();
  }

  @ApiOperation({ summary: 'Create a marketing experiment' })
  @Post('experiments')
  createExperiment(@Body() dto: UpsertExperimentDto) {
    return this.marketing.createExperiment(dto);
  }

  @ApiOperation({ summary: 'Update a marketing experiment' })
  @Put('experiments/:id')
  updateExperiment(@Param('id') id: string, @Body() dto: UpdateExperimentDto) {
    return this.marketing.updateExperiment(id, dto);
  }

  @ApiOperation({ summary: 'Delete a marketing experiment' })
  @Delete('experiments/:id')
  deleteExperiment(@Param('id') id: string) {
    return this.marketing.deleteExperiment(id);
  }

  // ─── Content Calendar ──────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List content calendar items' })
  @Get('content-calendar')
  listContentItems() {
    return this.marketing.listContentItems();
  }

  @ApiOperation({ summary: 'Create a content calendar item' })
  @Post('content-calendar')
  createContentItem(@Body() dto: UpsertContentItemDto) {
    return this.marketing.createContentItem(dto);
  }

  @ApiOperation({ summary: 'Update a content calendar item' })
  @Put('content-calendar/:id')
  updateContentItem(
    @Param('id') id: string,
    @Body() dto: UpdateContentItemDto,
  ) {
    return this.marketing.updateContentItem(id, dto);
  }

  @ApiOperation({ summary: 'Delete a content calendar item' })
  @Delete('content-calendar/:id')
  deleteContentItem(@Param('id') id: string) {
    return this.marketing.deleteContentItem(id);
  }

  // ─── SEO ───────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List SEO pages' })
  @Get('seo/pages')
  listSeoPages() {
    return this.marketing.listSeoPages();
  }

  @ApiOperation({ summary: 'Create or update an SEO page' })
  @Post('seo/pages')
  upsertSeoPage(@Body() dto: UpsertSeoPageDto) {
    return this.marketing.upsertSeoPage(dto);
  }

  @ApiOperation({ summary: 'List SEO keyword clusters' })
  @Get('seo/keyword-clusters')
  listKeywordClusters() {
    return this.marketing.listKeywordClusters();
  }

  @ApiOperation({ summary: 'Create an SEO keyword cluster' })
  @Post('seo/keyword-clusters')
  createKeywordCluster(@Body() dto: UpsertKeywordClusterDto) {
    return this.marketing.createKeywordCluster(dto);
  }

  // ─── Lifecycle Flows ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List lifecycle flows with steps' })
  @Get('lifecycle-flows')
  listLifecycleFlows() {
    return this.marketing.listLifecycleFlows();
  }

  @ApiOperation({ summary: 'Create a lifecycle flow with steps' })
  @Post('lifecycle-flows')
  createLifecycleFlow(@Body() dto: UpsertLifecycleFlowDto) {
    return this.marketing.createLifecycleFlow(dto);
  }

  // ─── 90-Day Plan ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'List 90-day plan items' })
  @Get('plan-items')
  listPlanItems() {
    return this.marketing.listPlanItems();
  }

  @ApiOperation({ summary: 'Create a 90-day plan item' })
  @Post('plan-items')
  createPlanItem(@Body() dto: UpsertPlanItemDto) {
    return this.marketing.createPlanItem(dto);
  }

  @ApiOperation({ summary: 'Update a 90-day plan item' })
  @Patch('plan-items/:id')
  updatePlanItem(@Param('id') id: string, @Body() dto: UpdatePlanItemDto) {
    return this.marketing.updatePlanItem(id, dto);
  }

  // ─── Intake Responses ──────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Get all intake responses keyed by question id' })
  @Get('intake-responses')
  listIntakeResponses() {
    return this.marketing.listIntakeResponses();
  }

  @ApiOperation({ summary: 'Upsert a single intake response' })
  @Post('intake-responses')
  upsertIntakeResponse(@Body() dto: UpsertIntakeResponseDto) {
    return this.marketing.upsertIntakeResponse(dto);
  }

  @ApiOperation({
    summary: 'Bulk upsert intake responses (questionId → value map)',
  })
  @Put('intake-responses')
  upsertIntakeBatch(@Body() body: Record<string, unknown>) {
    return this.marketing.upsertIntakeResponseBatch(body);
  }

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Compute North Star KPIs from live booking/payment data',
  })
  @Get('kpis/north-star')
  northStar() {
    return this.marketing.getNorthStarKpis();
  }

  @ApiOperation({
    summary: 'Compute Acquisition KPIs (CAC, signups, referral %)',
  })
  @Get('kpis/acquisition')
  acquisition() {
    return this.marketing.getAcquisitionKpis();
  }

  @ApiOperation({
    summary: 'Compute Activation KPIs (signup→booking, onboarding)',
  })
  @Get('kpis/activation')
  activation() {
    return this.marketing.getActivationKpis();
  }

  @ApiOperation({
    summary: 'Compute Retention KPIs (D30, D90 cohort retention)',
  })
  @Get('kpis/retention')
  retention() {
    return this.marketing.getRetentionKpis();
  }
}
