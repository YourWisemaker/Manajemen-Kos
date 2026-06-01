/**
 * Storage Service — Task 14.1
 *
 * Manages file uploads (KTP images, contract documents, transfer proofs)
 * with tenant-scoped paths in R2/S3.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as s3GetSignedUrl } from "@aws-sdk/s3-request-presigner";

import { requireTenantId } from "@/lib/server/tenant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UploadResult {
  /** Storage key: /{tenant_id}/{property_id}/{category}/{filename} */
  key: string;
  /** Signed URL for immediate access */
  url: string;
  /** File size in bytes */
  size: number;
}

export type FileCategory = "ktp" | "contract" | "transfer_proof" | "logo" | "attachment";

export interface UploadMetadata {
  propertyId?: string;
  entityId?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** MIME types allowed per category — Req 11.2 */
const ALLOWED_MIME_TYPES: Record<FileCategory, string[]> = {
  ktp: ["image/jpeg", "image/png", "image/webp"],
  contract: ["application/pdf", "image/jpeg", "image/png"],
  transfer_proof: ["image/jpeg", "image/png", "image/webp"],
  logo: ["image/jpeg", "image/png", "image/svg+xml", "image/webp"],
  attachment: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

/** Max file size per category in bytes — Req 11.3 */
const MAX_FILE_SIZE: Record<FileCategory, number> = {
  ktp: 5 * 1024 * 1024, // 5 MB
  contract: 10 * 1024 * 1024, // 10 MB
  transfer_proof: 5 * 1024 * 1024, // 5 MB
  logo: 2 * 1024 * 1024, // 2 MB
  attachment: 10 * 1024 * 1024, // 10 MB
};

/** Default signed URL expiry in seconds (1 hour) — Req 11.4 */
const DEFAULT_SIGNED_URL_EXPIRY = 3600;

// ---------------------------------------------------------------------------
// S3 Client — lazy initialization
// ---------------------------------------------------------------------------

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: true,
    });
  }
  return _s3;
}

function getBucket(): string {
  return process.env.S3_BUCKET ?? "koskita-uploads";
}

// ---------------------------------------------------------------------------
// StorageService — Req 11.1–11.6
// ---------------------------------------------------------------------------

export class StorageService {
  /**
   * Upload a file to tenant-scoped path.
   * Validates MIME type and file size before uploading.
   *
   * Path structure: /{tenant_id}/{property_id}/{category}/{filename}
   * — Req 11.1, 11.2, 11.3, 11.5
   */
  async upload(
    file: File | Buffer,
    category: FileCategory,
    metadata?: UploadMetadata,
  ): Promise<UploadResult> {
    const tenantId = requireTenantId();

    // Resolve file data
    let buffer: Buffer;
    let mimeType: string;
    let fileName: string;

    if (Buffer.isBuffer(file)) {
      buffer = file;
      mimeType = "application/octet-stream";
      fileName = `upload-${Date.now()}`;
    } else {
      const fileObj = file as File;
      const arrayBuffer = await fileObj.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = fileObj.type;
      fileName = fileObj.name;
    }

    // Validate MIME type — Req 11.2
    const allowedTypes = ALLOWED_MIME_TYPES[category];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(
        `Invalid file type '${mimeType}' for category '${category}'. ` +
          `Allowed: ${allowedTypes.join(", ")}`,
      );
    }

    // Validate file size — Req 11.3
    const maxSize = MAX_FILE_SIZE[category];
    if (buffer.length > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      throw new Error(
        `File size (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds ` +
          `maximum ${maxMB} MB for category '${category}'.`,
      );
    }

    // Build tenant-scoped key — Req 11.1, 11.5
    const propertySegment = metadata?.propertyId ?? "_general";
    const sanitizedName = sanitizeFilename(fileName);
    const uniqueName = `${Date.now()}-${sanitizedName}`;
    const key = `${tenantId}/${propertySegment}/${category}/${uniqueName}`;

    // Upload to S3/R2
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: {
          tenantId,
          category,
          ...(metadata?.entityId ? { entityId: metadata.entityId } : {}),
        },
      }),
    );

    // Generate signed URL for immediate access
    const url = await this.getSignedUrl(key);

    return { key, url, size: buffer.length };
  }

  /**
   * Generate a time-limited signed URL for reading a file.
   * Default expiry: 1 hour — Req 11.4
   */
  async getSignedUrl(
    key: string,
    expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY,
  ): Promise<string> {
    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    });

    return s3GetSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Delete a file (soft-delete: move to _trash/ path).
   * Prevents accidental permanent deletion.
   */
  async delete(key: string): Promise<void> {
    const tenantId = requireTenantId();

    // Ensure the key belongs to the current tenant — Req 11.5
    if (!key.startsWith(`${tenantId}/`)) {
      throw new Error("Forbidden: cannot delete files belonging to another tenant.");
    }

    const s3 = getS3Client();
    const bucket = getBucket();

    // Copy to trash path, then delete original
    const trashKey = `_trash/${key}`;

    // Read original
    const getResult = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    if (getResult.Body) {
      const bodyBytes = await getResult.Body.transformToByteArray();
      // Write to trash
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: trashKey,
          Body: bodyBytes,
          ContentType: getResult.ContentType,
        }),
      );
    }

    // Delete original
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  /**
   * Purge all files for a tenant (for account deletion).
   * Deletes all objects under the tenant's prefix — Req 11.6
   */
  async purgeTenant(tenantId: string): Promise<void> {
    const s3 = getS3Client();
    const bucket = getBucket();
    const prefix = `${tenantId}/`;

    let continuationToken: string | undefined;

    do {
      const listResult = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      const objects = listResult.Contents ?? [];

      // Delete objects in parallel (batches of 10)
      const deletePromises = objects.map((obj) =>
        obj.Key
          ? s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }))
          : Promise.resolve(),
      );
      await Promise.all(deletePromises);

      continuationToken = listResult.IsTruncated
        ? listResult.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sanitize a filename: remove path separators and special chars. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const storageService = new StorageService();
