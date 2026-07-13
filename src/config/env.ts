import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_URL: process.env.DB_URL!,
  

  EMAIL: {
    HOST: process.env.SMTP_HOST!,
    PORT: Number(process.env.SMTP_PORT) || 587,
    USER: process.env.SMTP_USER!,
    PASS: process.env.SMTP_PASS!,
  },

  NOTIFICATIONS: {
    MANAGER_EMAIL: process.env.MANAGER_EMAIL!,
    HR_EMAIL: process.env.HR_EMAIL!,
  },
  
};