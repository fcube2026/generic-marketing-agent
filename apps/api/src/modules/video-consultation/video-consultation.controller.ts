import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { VideoConsultationService } from './video-consultation.service';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { GenerateTokenQueryDto } from './dto/generate-token.dto';
import { CreateRoomResponseDto } from './dto/create-room-response.dto';
import { GenerateTokenResponseDto } from './dto/generate-token-response.dto';

@ApiTags('Video Consultation')
@ApiBearerAuth()
@Controller('video-sessions')
export class VideoConsultationController {
  constructor(
    private readonly videoConsultationService: VideoConsultationService,
  ) {}

  /**
   * Create a Jitsi video room for the given booking.
   * Only the patient or provider of the booking may call this endpoint.
   * The booking must be in ACCEPTED status.
   */
  @ApiOperation({
    summary: 'Create video room',
    description:
      'Creates a secure Jitsi video room for the booking and persists a VideoSession record. ' +
      'Only the patient or provider of the booking may call this. ' +
      'The booking must be in ACCEPTED status. Idempotent — returns the existing session if already created.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiCreatedResponse({
    description: 'Video session created (or existing session returned)',
    type: CreateRoomResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Caller is not the patient or provider of this booking',
  })
  @ApiBadRequestResponse({
    description: 'Booking is not in ACCEPTED status',
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  @Post(':bookingId/create')
  createRoom(@CurrentUser() user: any, @Param('bookingId') bookingId: string) {
    return this.videoConsultationService.createRoom(bookingId, user.id);
  }

  /**
   * Generate Jitsi connection details for the given booking's video room.
   * Only the patient or provider of the booking may call this endpoint.
   * The room must already have been created via POST /:bookingId/create.
   */
  @ApiOperation({
    summary: 'Get Jitsi connection details',
    description:
      'Returns the secure Jitsi meet URL so the caller can join the video room. ' +
      'Only the patient or provider of the booking may call this. ' +
      'The room must first be created via POST /video-sessions/:bookingId/create.',
  })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Override the default participant role (host/guest)',
  })
  @ApiOkResponse({
    description: 'Jitsi connection details returned successfully',
    type: GenerateTokenResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Caller is not the patient or provider of this booking',
  })
  @ApiNotFoundResponse({
    description: 'Booking not found or video session not yet created',
  })
  @Get(':bookingId/token')
  generateToken(
    @CurrentUser() user: any,
    @Param('bookingId') bookingId: string,
    @Query() query: GenerateTokenQueryDto,
  ) {
    if (query.role && !['host', 'guest'].includes(query.role)) {
      throw new BadRequestException('Invalid role. Must be host or guest.');
    }
    return this.videoConsultationService.generateToken(
      bookingId,
      user.id,
      query.role,
    );
  }
}
