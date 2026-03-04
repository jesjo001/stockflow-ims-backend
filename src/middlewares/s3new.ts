import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl as getAwsSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import { logger } from "../config/logger";

// Initialize S3 client with proper configuration
const s3Client = new S3Client({
  region: env.AWS_REGION || 'eu-north-1',
  credentials: env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

interface PresignedPostParams {
  key: string;
  contentType: string;
}

export const createPresignedPost = async ({ key, contentType }: PresignedPostParams) => {
  const bucketName = env.AWS_S3_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error("S3 bucket name is not configured. Please set AWS_S3_BUCKET_NAME in environment variables.");
  }
  
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment variables.");
  }

  try {
    // Generate presigned URL for PUT (upload)
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getAwsSignedUrl(s3Client, command, {
      expiresIn: 60 * 5, // 5 minutes
    });

    return {
      url,
      fields: {},
    };
  } catch (error) {
    logger.error('Error creating presigned post:', error);
    throw error;
  }
};

export const getSignedUrl = async (key: string): Promise<string> => {
  const bucketName = env.AWS_S3_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error("S3 bucket name is not configured. Please set AWS_S3_BUCKET_NAME in environment variables.");
  }
  
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment variables.");
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getAwsSignedUrl(s3Client, command, {
      expiresIn: 60 * 60, // 1 hour
    });

    return signedUrl;
  } catch (error) {
    logger.error('Error creating signed URL:', error);
    throw error;
  }
};
