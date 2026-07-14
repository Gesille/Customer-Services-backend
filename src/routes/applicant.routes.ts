import { Router } from 'express';
import multer from 'multer';
import { applicantController } from '../controllers/applicant.controller';


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const appRoute = Router();

appRoute.post('/jobs/:jobId/apply', upload.single('resume'), (req, res) =>
  applicantController.apply(req, res),
);

appRoute.get('/jobs/:jobId/applicants', (req, res) => applicantController.getByJob(req, res));

appRoute.get('/applicants/:applicantId/attachments/:attachmentId', (req, res) =>
  applicantController.downloadAttachment(req, res),
);

export default appRoute;
