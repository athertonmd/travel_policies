import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tpip',
  },
  aws: {
    region: process.env.AWS_REGION || 'eu-west-1',
    s3Bucket: process.env.S3_BUCKET || 'tpip-policy-documents',
  },
  env: process.env.NODE_ENV || 'development',
};
