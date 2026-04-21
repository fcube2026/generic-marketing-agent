import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TriageService } from './triage.service';
import { CreateClinicalIntakeDto } from './dto/create-clinical-intake.dto';
import { TriageLevel } from '@prisma/client';

@Injectable()
export class ClinicalIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly triageService: TriageService,
  ) {}

  async createIntake(
    patientUserId: string,
    bookingId: string,
    dto: CreateClinicalIntakeDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.patient.userId !== patientUserId)
      throw new ForbiddenException('Not your booking');

    const existing = await this.prisma.clinicalIntake.findUnique({
      where: { bookingId },
    });
    if (existing)
      throw new ConflictException(
        'Clinical intake already submitted for this booking',
      );

    const triageInput = [dto.consultationReason, dto.symptoms].join(' ');
    const triage = this.triageService.analyze(triageInput);

    const intake = await this.prisma.clinicalIntake.create({
      data: {
        bookingId,
        consultationReason: dto.consultationReason,
        symptoms: dto.symptoms,
        allergies: dto.allergies,
        currentMedications: dto.currentMedications,
        medicalHistory: dto.medicalHistory,
        hasPets: dto.hasPets ?? false,
        petType: dto.petType,
        gateCode: dto.gateCode,
        floorNumber: dto.floorNumber,
        patientAlone: dto.patientAlone ?? false,
        mobilityConstraint: dto.mobilityConstraint ?? false,
        infectionRiskFlag: dto.infectionRiskFlag ?? false,
        specialInstructions: dto.specialInstructions,
        triageLevel: triage.triageLevel,
        triageFlags: triage.triageFlags,
        emergencyRedirected: triage.emergencyRedirected,
      },
    });

    // If EMERGENCY or URGENT, bump risk score in verification record
    if (triage.triageLevel !== TriageLevel.STANDARD) {
      const addScore = triage.triageLevel === TriageLevel.EMERGENCY ? 40 : 20;
      const pv = await this.prisma.patientVerification.findUnique({
        where: { patientId: booking.patientId },
      });
      if (pv) {
        await this.prisma.patientVerification.update({
          where: { id: pv.id },
          data: {
            riskScore: { increment: addScore },
            riskTriggers: {
              set: [
                ...pv.riskTriggers,
                triage.triageLevel === TriageLevel.EMERGENCY
                  ? 'EMERGENCY_SYMPTOMS'
                  : 'URGENT_SYMPTOMS',
              ],
            },
          },
        });
      }
    }

    return {
      intakeId: intake.id,
      triageLevel: triage.triageLevel,
      triageFlags: triage.triageFlags,
      emergencyRedirected: triage.emergencyRedirected,
      bannerMessage: triage.bannerMessage,
    };
  }

  async getIntake(userId: string, bookingId: string, role: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        patient: true,
        provider: true,
        clinicalIntake: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isPatient = booking.patient.userId === userId;
    const isProvider = booking.provider.userId === userId;
    if (!isPatient && !isProvider && role !== 'ADMIN')
      throw new ForbiddenException('Access denied');

    if (!booking.clinicalIntake)
      throw new NotFoundException('No clinical intake found for this booking');

    return booking.clinicalIntake;
  }
}
