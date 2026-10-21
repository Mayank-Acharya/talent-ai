import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

import authRouter from './routes/auth';
import companiesRouter from './routes/companies';
import interviewsRouter from './routes/interviews';
import candidatesRouter from './routes/candidates';
import sessionsRouter from './routes/sessions';
import analyticsRouter from './routes/analytics';
import billingRouter from './routes/billing';
import leetcodeRouter from './routes/leetcode';
import judgeRouter from './routes/judge';
import questionbankRouter from './routes/questionbank';
import studentRouter from './routes/student';
import arenaRouter from './routes/arena';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON payloads
app.use(express.json());

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const resolvedUploadDir = path.resolve(uploadDir);
if (!fs.existsSync(resolvedUploadDir)) {
  fs.mkdirSync(resolvedUploadDir, { recursive: true });
  console.log(`Created uploads directory at: ${resolvedUploadDir}`);
}

// Serve uploaded assets statically (videos, resumes) with proper video MIME types
app.use('/uploads', express.static(resolvedUploadDir, {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.webm' || ext === '.mp4' || ext === '.mkv' || !ext) {
      res.setHeader('Content-Type', 'video/webm');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));

// Register API Routes
app.use('/api/auth', authRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/leetcode', leetcodeRouter);
app.use('/api/judge', judgeRouter);
app.use('/api/question-bank', questionbankRouter);
app.use('/api/student', studentRouter);
app.use('/api/arena', arenaRouter);

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TalentAI Backend API is running', time: new Date() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Start Express Server on both PORT (5000) and Render default (10000)
const primaryPort = Number(process.env.PORT) || 5000;
app.listen(primaryPort, '0.0.0.0', () => {
  console.log(`[TalentAI Server] running on http://0.0.0.0:${primaryPort}`);
  console.log(`[Database Connection] using configuration in Prisma schema`);
});

if (primaryPort !== 10000) {
  try {
    app.listen(10000, '0.0.0.0', () => {
      console.log(`[TalentAI Server] also listening on http://0.0.0.0:10000`);
    });
  } catch (err) {
    console.log('Dual port bind notice:', err);
  }
}
