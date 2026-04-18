import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_ai',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  kafka: {
    broker: process.env.KAFKA_BROKER || 'localhost:9092',
    topic: process.env.KAFKA_TOPIC || 'transactions',
    groupId: 'finance-consumer-group',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    fastModel: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',
    baseURL: 'https://api.groq.com/openai/v1',
  },


  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-this',
    refreshExpiresIn: '30d',
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'ap-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'finance-ai-uploads',
  },

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
