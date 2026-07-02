
import cors from 'cors';
import routes from './routes/index';

import cookieParser from "cookie-parser";
import { rateLimit } from 'express-rate-limit'
import express,{NextFunction, Request, Response} from "express";
import { ErrorMiddleware } from './dashoard/middleware/error';


const app = express();

// Middlewares
app.use(cors());
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
// Routes
app.use('/api/v1', routes);


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