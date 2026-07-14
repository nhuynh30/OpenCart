import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION!;
const bucket = process.env.AWS_S3_BUCKET_NAME!;

const globalForS3 = globalThis as unknown as { s3Client: S3Client | undefined };

const s3Client =
  globalForS3.s3Client ??
  new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForS3.s3Client = s3Client;
}

// Assumes the bucket has a resource policy granting public s3:GetObject on this
// prefix (modern buckets block per-object ACLs by default) — see .env.example.
export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
