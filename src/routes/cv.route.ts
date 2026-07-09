import { Router } from 'express';
import { downloadCV, getAllCVs, submitCV } from '../controllers/careers.controller';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';


export const cvRouter = Router();

cvRouter.post('/submit-cv', submitCV);
cvRouter.get('/all', isAuthenticated, authorizeRoles("admin"), getAllCVs);
cvRouter.get('/download/:attachmentId', isAuthenticated, authorizeRoles("admin"), downloadCV);

export default cvRouter;