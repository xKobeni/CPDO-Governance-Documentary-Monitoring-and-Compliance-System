import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.js";

const endpoint = env.b2Endpoint?.startsWith("http")
  ? env.b2Endpoint
  : `https://${env.b2Endpoint}`;

// B2 S3-compatible endpoints encode the region: "s3.<region>.backblazeb2.com"
const regionMatch = env.b2Endpoint?.match(/s3\.([^.]+)\.backblazeb2\.com/);
const region = regionMatch?.[1] ?? "us-east-005";

export const b2Client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.b2KeyId,
    secretAccessKey: env.b2ApplicationKey,
  },
});