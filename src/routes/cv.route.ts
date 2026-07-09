import { Router } from 'express';
import { submitCV } from '../controllers/careers.controller';
import { isAuthenticated } from '../middleware/auth';


export const cvRouter = Router();

cvRouter.post('/submit-cv',isAuthenticated, submitCV);

export default cvRouter;