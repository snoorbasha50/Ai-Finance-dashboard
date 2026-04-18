import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { logger } from '../utils/logger';

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export async function uploadPDFToS3(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const key = `uploads/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    })
  );

  const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
  logger.info({ key }, 'PDF uploaded to S3');
  return url;
}
