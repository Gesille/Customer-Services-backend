
import cors from 'cors';
import routes from './routes/index';

import cookieParser from "cookie-parser";
import { rateLimit } from 'express-rate-limit'
import express,{NextFunction, Request, Response} from "express";
import { ErrorMiddleware } from './middleware/error';
import userRouter from './routes/user.route';
import { cvRouter } from './routes/cv.route';
import appRoute from './routes/applicant.routes';
import contactRouter from './routes/Contact.routes';
import questionsRouter from './routes/Question.routes';
import dashboardRouter from './routes/dashboard.routes';




const app = express();

// Middlewares
app.use(
  cors({
    origin: [
      "https://restaurant-feedback-dashboard.vercel.app",
      "https://restaurant-feedback-frontend-lovat.vercel.app",
      "http://localhost:3000"
    ],
    credentials: true,
  })
);
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, 
	limit: 100, 
	standardHeaders: 'draft-7',
	legacyHeaders: false, 
	
})
app.use(limiter); 
// Routes
app.use('/api/v1', routes);
app.use("/api/v1",userRouter);
app.use("/api/v1", cvRouter);
app.use('/api/v1',appRoute)
app.use('/api/v1',contactRouter)
app.use('/api/v1',questionsRouter)
app.use('/api/v1',dashboardRouter)


//unknoun route
app.all("*", (req:Request , res:Response , next:NextFunction) =>{
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode =404;
    next(err);
});

app.use(limiter); 
// Error handler
app.use(ErrorMiddleware);

export default app;