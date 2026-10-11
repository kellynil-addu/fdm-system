/**
 * scripts/migrate-client-documents-prefix.ts
 *
 * Migrates legacy client document objects in the shared S3 bucket to the new
 * `clients/` folder prefix, and updates database records in public.client_document.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-client-documents-prefix.ts [--dry-run]
 */

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

function getStorageClient(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing S3 configuration (S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)"
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

function getStorageBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("Missing required configuration: S3_BUCKET");
  return bucket;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const sourceBucketArg = process.argv
    .find((arg) => arg.startsWith("--source-bucket="))
    ?.split("=")[1];
  const legacySourceBucket =
    sourceBucketArg || process.env.SOURCE_S3_BUCKET || "client-documents";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }

  const s3 = getStorageClient();
  const targetBucket = getStorageBucket();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Starting client document path migration:`);
  console.log(`  Target Bucket: '${targetBucket}'`);
  console.log(`  Source Bucket fallback: '${legacySourceBucket}'`);
  console.log(`  Dry Run: ${isDryRun}`);

  const { data: documents, error } = await supabase
    .from("client_document")
    .select("document_id, file_path");

  if (error) {
    throw new Error(`Failed to query client documents: ${error.message}`);
  }

  const allDocs = documents ?? [];
  console.log(`Found ${allDocs.length} total document(s) in database.\n`);

  let migratedCount = 0;
  let alreadyMigratedCount = 0;
  let missingObjectCount = 0;
  let failedCount = 0;

  for (const doc of allDocs) {
    if (!doc.file_path) continue;

    const unprefixedKey = doc.file_path.replace(/^clients\//, "").replace(/^\/+/, "");
    const targetKey = `clients/${unprefixedKey}`;

    console.log(`Processing doc ${doc.document_id}:`);
    console.log(`  Target: '${targetBucket}' -> '${targetKey}'`);

    try {
      // 1. Check if already properly in place in target bucket
      let alreadyInTarget = false;
      try {
        await s3.send(new HeadObjectCommand({ Bucket: targetBucket, Key: targetKey }));
        alreadyInTarget = true;
      } catch {
        alreadyInTarget = false;
      }

      if (alreadyInTarget) {
        console.log(`  ✓ Object already exists at '${targetBucket}/${targetKey}'`);
        // Ensure DB row is synced
        if (doc.file_path !== targetKey && !isDryRun) {
          await supabase
            .from("client_document")
            .update({ file_path: targetKey })
            .eq("document_id", doc.document_id);
          console.log("  ✓ Database record synchronized");
        }
        alreadyMigratedCount++;
        continue;
      }

      // 2. Locate source object across possible buckets and key variations
      let sourceBucket: string | null = null;
      let sourceKey: string | null = null;

      const candidates = [
        // Legacy key in legacy source bucket (most common: client-documents/UUID/...)
        { bucket: legacySourceBucket, key: unprefixedKey },
        // Prefixed key in legacy source bucket
        { bucket: legacySourceBucket, key: targetKey },
        // Unprefixed key in target bucket (if files were uploaded to target before folder prefix)
        { bucket: targetBucket, key: unprefixedKey },
      ];

      for (const candidate of candidates) {
        try {
          await s3.send(
            new HeadObjectCommand({ Bucket: candidate.bucket, Key: candidate.key })
          );
          sourceBucket = candidate.bucket;
          sourceKey = candidate.key;
          break;
        } catch {
          // Continue searching
        }
      }

      if (!sourceBucket || !sourceKey) {
        console.warn(
          `  ⚠️ Physical file not found in '${targetBucket}' or '${legacySourceBucket}' for keys '${unprefixedKey}' or '${targetKey}'`
        );
        missingObjectCount++;
        continue;
      }

      console.log(`  ✓ Located source file in '${sourceBucket}' at '${sourceKey}'`);

      if (isDryRun) {
        console.log(
          `  [DRY RUN] Would copy '${sourceBucket}/${sourceKey}' -> '${targetBucket}/${targetKey}', delete from '${sourceBucket}', and update DB.`
        );
        migratedCount++;
        continue;
      }

      // 3. Copy to target bucket under targetKey
      await s3.send(
        new CopyObjectCommand({
          Bucket: targetBucket,
          CopySource: encodeURIComponent(`${sourceBucket}/${sourceKey}`),
          Key: targetKey,
        })
      );
      console.log(`  ✓ Copied to '${targetBucket}/${targetKey}'`);

      // 4. Delete source object (only if different location)
      if (sourceBucket !== targetBucket || sourceKey !== targetKey) {
        await s3.send(new DeleteObjectCommand({ Bucket: sourceBucket, Key: sourceKey }));
        console.log(`  ✓ Removed old source object from '${sourceBucket}/${sourceKey}'`);
      }

      // 5. Update database row
      if (doc.file_path !== targetKey) {
        const { error: updateError } = await supabase
          .from("client_document")
          .update({ file_path: targetKey })
          .eq("document_id", doc.document_id);

        if (updateError) throw updateError;
        console.log("  ✓ Database record updated");
      }

      migratedCount++;
    } catch (err) {
      console.error(`  ❌ Failed to migrate document ${doc.document_id}:`, err);
      failedCount++;
    }
  }

  console.log("\n================ Migration Summary ================");
  console.log(`Total checked: ${allDocs.length}`);
  console.log(`Successfully migrated / copied: ${migratedCount}`);
  console.log(`Already in place: ${alreadyMigratedCount}`);
  if (missingObjectCount > 0) {
    console.log(`Missing in storage: ${missingObjectCount}`);
  }
  if (failedCount > 0) {
    console.log(`Failed: ${failedCount}`);
  }
  console.log("===================================================\n");
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
