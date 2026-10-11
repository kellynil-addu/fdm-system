import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

/**
 * Returns an S3Client instance configured for Supabase S3 (dev) or Backblaze B2 (prod).
 *
 * Path-style addressing and on-demand checksums ensure compatibility across both providers.
 */
export function getStorageClient(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing S3 storage configuration (S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)"
    );
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/**
 * Returns the single required storage bucket name.
 */
export function getStorageBucket(): string {
  const bucket = process.env.S3_BUCKET;

  if (!bucket) {
    throw new Error("Missing required S3 storage configuration: S3_BUCKET");
  }

  return bucket;
}
