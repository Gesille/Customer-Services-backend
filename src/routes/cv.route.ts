import { Router } from 'express';
import { addApplicantNote, assignApplicant, downloadCV, getAllCVs, submitCV, updateApplicantStage } from '../controllers/careers.controller';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';


export const cvRouter = Router();

cvRouter.post('/submit-cv', submitCV);
cvRouter.get('/all', isAuthenticated, authorizeRoles("admin"), getAllCVs);
cvRouter.get('/download/:attachmentId', isAuthenticated, authorizeRoles("admin"), downloadCV);
cvRouter.patch("/:id/stage", isAuthenticated, authorizeRoles("admin"), updateApplicantStage);
cvRouter.patch("/:id/assign", isAuthenticated, authorizeRoles("admin"), assignApplicant);
cvRouter.post("/:id/notes", isAuthenticated, authorizeRoles("admin"), addApplicantNote);
export default cvRouter;