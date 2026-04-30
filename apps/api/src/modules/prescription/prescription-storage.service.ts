import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Bucket used for all uploaded prescription files. */
const DEFAULT_BUCKET = 'prescriptions';

/** Signed URL expiry in seconds (5 minutes). */
const SIGNED_URL_EXPIRY_SECONDS = 300;
const MIN_SIGNED_URL_EXPIRY_SECONDS = 60;

const BUCKET_FILE_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;
const BUCKET_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

const SUPABASE_SIGNED_PATH_SEGMENT = '/storage/v1/object/sign/';
const SUPABASE_PUBLIC_PATH_SEGMENT = '/storage/v1/object/public/';

@Injectable()
export class PrescriptionStorageService implements OnModuleInit {
  private readonly client: SupabaseClient | null;
  private readonly logger = new Logger(PrescriptionStorageService.name);
  private readonly bucketName: string;
  private readonly signedUrlExpirySeconds: number;
  private readonly hasValidConfig: boolean;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL', '');
    const serviceKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY', '');
    this.bucketName = this.config.get<string>(
      'PRESCRIPTION_STORAGE_BUCKET',
      DEFAULT_BUCKET,
    );
    const configuredExpiry = this.config.get<number>(
      'PRESCRIPTION_SIGNED_URL_EXPIRY_SECONDS',
      SIGNED_URL_EXPIRY_SECONDS,
    );
    // Guard against bad env values (0/negative/non-number) that would
    // create immediately-expired URLs and trigger InvalidJWT(exp) errors.
    const normalizedExpiry = Number(configuredExpiry);
    if (!Number.isFinite(normalizedExpiry)) {
      this.logger.warn(
        'PRESCRIPTION_SIGNED_URL_EXPIRY_SECONDS is invalid. Falling back to 300 seconds.',
      );
      this.signedUrlExpirySeconds = SIGNED_URL_EXPIRY_SECONDS;
    } else if (normalizedExpiry < MIN_SIGNED_URL_EXPIRY_SECONDS) {
      this.logger.warn(
        `PRESCRIPTION_SIGNED_URL_EXPIRY_SECONDS (${normalizedExpiry}) is too low. Using minimum ${MIN_SIGNED_URL_EXPIRY_SECONDS} seconds.`,
      );
      this.signedUrlExpirySeconds = MIN_SIGNED_URL_EXPIRY_SECONDS;
    } else {
      this.signedUrlExpirySeconds = Math.floor(normalizedExpiry);
    }

    if (!url || !serviceKey) {
      this.logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
          'Prescription storage operations will fail at runtime.',
      );
      this.hasValidConfig = false;
      this.client = null;
      return;
    }

    if (!this.isServiceRoleKey(serviceKey)) {
      this.logger.error(
        'SUPABASE_SERVICE_ROLE_KEY is not a service-role/secret key. ' +
          'Use the backend service role key, not the anon or publishable key.',
      );
      this.hasValidConfig = false;
      this.client = null;
      return;
    }

    this.client = createClient(url, serviceKey);
    this.hasValidConfig = true;
  }

  async onModuleInit(): Promise<void> {
    if (!this.client || !this.hasValidConfig) {
      return;
    }

    await this.ensureBucketConfiguration();
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
    const client = this.getClient();
    const filePath = `${userId}/${prescriptionId}`;

    const { error } = await client.storage
      .from(this.bucketName)
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
    const client = this.getClient();

    const { data, error } = await client.storage
      .from(this.bucketName)
      .createSignedUrl(filePath, this.signedUrlExpirySeconds);

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

  /**
   * Convert a stored prescription reference into a fresh browser-safe URL.
   *
   * Stored values may be either:
   * - a stable storage path (preferred for new records), or
   * - an older signed/public Supabase URL already persisted in the DB.
   */
  async resolveReadUrl(storedValue?: string | null): Promise<string | null> {
    const normalizedValue = storedValue?.trim();
    if (!normalizedValue) {
      return null;
    }

    const filePath = this.extractFilePath(normalizedValue);
    if (!filePath) {
      return normalizedValue;
    }

    return this.getSignedUrl(filePath);
  }

  private getClient(): SupabaseClient {
    if (!this.client || !this.hasValidConfig) {
      throw new Error(
        'Prescription storage is not configured. Set SUPABASE_URL and a valid SUPABASE_SERVICE_ROLE_KEY.',
      );
    }

    return this.client;
  }

  private async ensureBucketConfiguration(): Promise<void> {
    const client = this.getClient();

    const { data: bucket, error: getBucketError } =
      await client.storage.getBucket(this.bucketName);

    if (getBucketError) {
      const { error: createBucketError } = await client.storage.createBucket(
        this.bucketName,
        {
          public: false,
          fileSizeLimit: `${BUCKET_FILE_SIZE_LIMIT_BYTES}`,
          allowedMimeTypes: BUCKET_ALLOWED_MIME_TYPES,
        },
      );

      if (createBucketError) {
        this.logger.error(
          `Failed to create prescription bucket ${this.bucketName}: ${createBucketError.message}`,
        );
        return;
      }

      this.logger.log(
        `Created private prescription bucket ${this.bucketName} with restricted MIME types and 10 MB limit.`,
      );
      return;
    }

    const bucketNeedsUpdate =
      bucket.public ||
      bucket.file_size_limit !== BUCKET_FILE_SIZE_LIMIT_BYTES ||
      !this.sameMimeTypes(
        bucket.allowed_mime_types ?? [],
        BUCKET_ALLOWED_MIME_TYPES,
      );

    if (!bucketNeedsUpdate) {
      return;
    }

    const { error: updateBucketError } = await client.storage.updateBucket(
      this.bucketName,
      {
        public: false,
        fileSizeLimit: `${BUCKET_FILE_SIZE_LIMIT_BYTES}`,
        allowedMimeTypes: BUCKET_ALLOWED_MIME_TYPES,
      },
    );

    if (updateBucketError) {
      this.logger.error(
        `Failed to update prescription bucket ${this.bucketName}: ${updateBucketError.message}`,
      );
      return;
    }

    this.logger.log(
      `Updated prescription bucket ${this.bucketName} to private access with restricted MIME types and 10 MB limit.`,
    );
  }

  private sameMimeTypes(current: string[], expected: string[]): boolean {
    if (current.length !== expected.length) {
      return false;
    }

    const currentSorted = [...current].sort();
    const expectedSorted = [...expected].sort();

    return currentSorted.every(
      (value, index) => value === expectedSorted[index],
    );
  }

  private isServiceRoleKey(value: string): boolean {
    if (value.startsWith('sb_secret_')) {
      return true;
    }

    if (value.startsWith('sb_publishable_')) {
      return false;
    }

    const jwtPayload = this.decodeJwtPayload(value);
    if (!jwtPayload || typeof jwtPayload !== 'object') {
      return false;
    }

    return jwtPayload.role === 'service_role';
  }

  private extractFilePath(value: string): string | null {
    if (!value.includes('://')) {
      return value;
    }

    try {
      const parsed = new URL(value);
      const signedPrefix = `${SUPABASE_SIGNED_PATH_SEGMENT}${this.bucketName}/`;
      const publicPrefix = `${SUPABASE_PUBLIC_PATH_SEGMENT}${this.bucketName}/`;

      if (parsed.pathname.includes(signedPrefix)) {
        return decodeURIComponent(
          parsed.pathname.slice(
            parsed.pathname.indexOf(signedPrefix) + signedPrefix.length,
          ),
        );
      }

      if (parsed.pathname.includes(publicPrefix)) {
        return decodeURIComponent(
          parsed.pathname.slice(
            parsed.pathname.indexOf(publicPrefix) + publicPrefix.length,
          ),
        );
      }
    } catch {
      return null;
    }

    return null;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        Math.ceil(normalized.length / 4) * 4,
        '=',
      );
      const json = Buffer.from(padded, 'base64').toString('utf8');
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
