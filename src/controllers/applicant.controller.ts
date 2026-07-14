import { NextFunction, Request, Response } from 'express';
import { applicantService } from '../services/applicant.service';
import { jobService } from '../services/job.service';
import { errorResponse, successResponse } from '../models/response.model';
import ErrorHandler from '../middleware/ErrorHandler';
import { ApplicantModel } from '../models/applicant.model';
import { CatchAsyncError } from '../middleware/catchAsyncError';


const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_RESUME_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export class ApplicantController {
  
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


  async getByJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const applicants = await applicantService.getByJob(jobId as string);
      res.status(200).json(successResponse('Applicants retrieved', applicants));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to retrieve applicants', err.message));
    }
  }


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



export const trackApplication = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return next(new ErrorHandler("Email and phone are required", 400));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).replace(/\D/g, "");

    if (!normalizedPhone) {
      return next(new ErrorHandler("Enter a valid phone number", 400));
    }

    // email is indexed, so filter on it in Mongo, then compare phone digits-only
    // in JS to tolerate formatting differences (spaces, dashes, +country code etc).
    const candidates = await ApplicantModel.find({ email: normalizedEmail })
      .populate("jobId", "title")
      .sort({ createdAt: -1 })
      .lean();

    const matches = candidates.filter(
      (a: any) => String(a.phone || "").replace(/\D/g, "") === normalizedPhone
    );

    if (matches.length === 0) {
      return next(
        new ErrorHandler("No application found for that email and phone", 404)
      );
    }

    const data = matches.map((applicant: any) => ({
      id: applicant._id.toString(),
      job: applicant.jobId?.title ?? null,
      stage: applicant.stage,
      submittedAt: applicant.createdAt,
      stageHistory: (applicant.stageHistory || []).map((h: any) => ({
        stage: h.stage,
        changedAt: h.changedAt,
      })),
      cvFiles: (applicant.attachments || []).map((att: any) => ({
        id: att._id.toString(),
        name: att.name,
        downloadUrl: `/api/v1/cv/download/${att._id.toString()}`,
      })),
    }));

    res.status(200).json({ success: true, data });
  }
);