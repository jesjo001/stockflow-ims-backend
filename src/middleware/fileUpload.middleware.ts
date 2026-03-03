import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';

if (!env.AWS_S3_BUCKET_NAME || !env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
  console.warn(
    '⚠️ AWS S3 environment variables not fully configured. File uploads will be disabled.'
  );
}

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new ApiError(StatusCodes.BAD_REQUEST, 'Not an image! Please upload only images.') as any, false);
  }
};

export const upload = multer({
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
  storage: multerS3({
    s3: s3,
    bucket: env.AWS_S3_BUCKET_NAME!,
    acl: 'public-read', // Make files publicly readable
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const folder = 'products'; // Or dynamically determine folder
      const fileName = `${folder}/${Date.now().toString()}${path.extname(file.originalname)}`;
      cb(null, fileName);
    },
  }),
});
