import { Request, Response } from 'express';
import { applicantService } from '../services/applicant.service';
import { jobService } from '../services/job.service';
import { errorResponse, successResponse } from '../models/response.model';


const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_RESUME_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export class ApplicantController {
  // POST /jobs/:jobId/apply  (multipart/form-data, field name "resume")
  async apply(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      const job = await jobService.getById(jobId as string);
      if (!job) {
        res.status(404).json(errorResponse('Job not found'));
        return;
      }
      if (job.status !== 'open') {
        res.status(400).json(errorResponse('This role is no longer accepting applications'));
        return;
      }

      const { name, email, phone, message, linkedin } = req.body;

      if (!name || !String(name).trim()) {
        res.status(400).json(errorResponse('Name is required'));
        return;
      }
      if (!email || !EMAIL_RE.test(String(email))) {
        res.status(400).json(errorResponse('A valid email is required'));
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json(errorResponse('A resume file is required'));
        return;
      }
      if (!ALLOWED_RESUME_MIME.includes(file.mimetype)) {
        res.status(400).json(errorResponse('Resume must be a PDF or Word document'));
        return;
      }
      if (file.size > MAX_RESUME_BYTES) {
        res.status(400).json(errorResponse('Resume must be under 10MB'));
        return;
      }

      const id = await applicantService.create({
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone ? String(phone).trim() : undefined,
        message: message ? String(message).trim() : undefined,
        linkedin: linkedin ? String(linkedin).trim() : undefined,
        jobId: jobId as string,
        resume: {
          name: file.originalname,
          mimetype: file.mimetype,
          data: file.buffer,
        },
      });

      res.status(201).json(successResponse('Application submitted', { id }));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to submit application', err.message));
    }
  }

  // GET /jobs/:jobId/applicants  (HR view)
  async getByJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const applicants = await applicantService.getByJob(jobId as string);
      res.status(200).json(successResponse('Applicants retrieved', applicants));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to retrieve applicants', err.message));
    }
  }

  // GET /applicants/:applicantId/attachments/:attachmentId  (HR resume download)
  async downloadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { applicantId, attachmentId } = req.params;
      const attachment = await applicantService.getAttachment(
        applicantId as string,
        attachmentId as string,
      );
      if (!attachment) {
        res.status(404).json(errorResponse('Attachment not found'));
        return;
      }
      res.setHeader('Content-Type', attachment.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
      res.send(attachment.data);
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to download attachment', err.message));
    }
  }
}

export const applicantController = new ApplicantController();