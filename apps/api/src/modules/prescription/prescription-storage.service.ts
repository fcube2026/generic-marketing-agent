import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Bucket used for all uploaded prescription files. */
const BUCKET = 'prescriptions';

/** Signed URL expiry in seconds (5 minutes). */
const SIGNED_URL_EXPIRY_SECONDS = 300;

@Injectable()
export class PrescriptionStorageService {
  private readonly client: SupabaseClient;
  private readonly logger = new Logger(PrescriptionStorageService.name);

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL', '');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
    this.client = createClient(url, serviceKey);
  }

  /**
   * Upload a file buffer to the private prescriptions bucket.
   *
   * @param userId      The ID of the uploading user.
   * @param prescriptionId  The newly generated prescription record ID.
   * @param buffer      Raw file bytes.
   * @param mimetype    MIME type of the file (e.g. image/jpeg, application/pdf).
   * @returns The storage path used to reference the file.
   */
  async uploadFile(
    userId: string,
    prescriptionId: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    const filePath = `${userId}/${prescriptionId}`;

    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(
        `Storage upload failed for prescription ${prescriptionId}: ${error.message}`,
        { userId, prescriptionId },
      );
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    this.logger.log(`Prescription file uploaded: ${filePath}`, {
      userId,
      prescriptionId,
    });

    return filePath;
  }

  /**
   * Generate a short-lived signed URL for read access to a private file.
   *
   * @param filePath Storage path as returned by {@link uploadFile}.
   * @returns A time-limited signed download URL.
   */
  async getSignedUrl(filePath: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data?.signedUrl) {
      this.logger.error(
        `Failed to generate signed URL for ${filePath}: ${error?.message}`,
      );
      throw new Error(
        `Failed to generate signed URL: ${error?.message ?? 'unknown error'}`,
      );
    }

    return data.signedUrl;
  }
}
