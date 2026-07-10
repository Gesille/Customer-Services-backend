import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../middleware/ErrorHandler";
import { ApplicantModel, STAGES } from "../models/applicant.model";
import sendMail from "../utils/sendMail";


// submitCV — creates an applicant record directly in MongoDB
export const submitCV = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, message, cvFile, cvFileName, jobId, phone, linkedin } = req.body;

      if (!name || !email || !cvFile || !phone) {
        return next(new ErrorHandler("Name, email, CV, and phone are required", 400));
      }

      const base64Data = String(cvFile).includes(",") ? String(cvFile).split(",")[1] : String(cvFile);
      const buffer = Buffer.from(base64Data, "base64");

      await ApplicantModel.create({
        name,
        email,
        phone: phone,
        message: message || "",
        linkedin: linkedin || undefined,
        jobId: jobId ? String(jobId) : undefined, 
        attachments: [
          {
            name: cvFileName || `CV_${name}.pdf`,
            mimetype: "application/pdf",
            data: buffer,
          },
        ],
      });

     if (!jobId) {
  try {
    await sendMail({
      email,
      subject: "We've received your CV",
      template: "cv-submission-confirmation.ejs",
      data: { name },
    });

    await sendMail({
      email: process.env.HR_EMAIL as string,
      subject: `New CV Submission — ${name}`,
      template: "new-cv-notification.ejs",
      data: {
        name,
        email,
        phone: phone,
        linkedin: linkedin || "Not provided",
        message: message || "No message provided",
        adminUrl: `${process.env.ADMIN_DASHBOARD_URL}/applicants`,
      },
    });
  } catch (mailError: any) {
    console.error("CV email notification error:", mailError);
  }
}
      res.status(201).json({ success: true, message: "CV submitted successfully" });
    } catch (error: any) {
      console.error("CV submission error:", error);
      return next(new ErrorHandler(error.message || "Failed to submit CV", 500));
    }
  }
);
// get all CVs (for admin)
export const getAllCVs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicants = await ApplicantModel.find()
  .sort({ createdAt: -1 })
  .populate("jobId", "title") 
  .lean();

      const data = applicants.map((applicant: any) => ({
        id: applicant._id.toString(),
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone ?? null,
        linkedin: applicant.linkedin ?? null,
        message: applicant.message ?? null,
        stage: applicant.stage,
        job: applicant.jobId?.title ?? null,
        submittedAt: applicant.createdAt,
        notes: (applicant.notes || []).map((n: any) => ({
  id: n._id.toString(),
  text: n.text,
  author: n.author,
  createdAt: n.createdAt,
})),
        cvFiles: (applicant.attachments || []).map((att: any) => ({
          id: att._id.toString(),
          name: att.name,
          mimetype: att.mimetype,
          downloadUrl: `/api/v1/cv/download/${att._id.toString()}`,
        })),
      }));

      res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error: any) {
      console.error("Get CVs error:", error);
      return next(new ErrorHandler(error.message || "Failed to fetch CVs", 500));
    }
  }
);


// download CV file by attachment ID (the attachment sub-document's _id)
export const downloadCV = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attachmentId = String(req.params.attachmentId);

      if (!mongoose.Types.ObjectId.isValid(attachmentId)) {
        return next(new ErrorHandler("Invalid attachment ID", 400));
      }

      const applicant = await ApplicantModel.findOne(
        { "attachments._id": attachmentId } as any,
        { "attachments.$": 1 } as any,
      ).lean();

      const attachment = (applicant as any)?.attachments?.[0];
      if (!attachment) {
        return next(new ErrorHandler("File not found", 404));
      }

      res.setHeader("Content-Type", attachment.mimetype || "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.name}"`
      );
      res.send(Buffer.isBuffer(attachment.data) ? attachment.data : Buffer.from(attachment.data.buffer));
    } catch (error: any) {
      console.error("Download CV error:", error);
      return next(new ErrorHandler(error.message || "Failed to download CV", 500));
    }
  }
);


export const updateApplicantStage = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { stage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id as any)) {
      return next(new ErrorHandler("Invalid applicant ID", 400));
    }
    if (!STAGES.includes(stage)) {
      return next(new ErrorHandler("Invalid stage value", 400));
    }

    const applicant = await ApplicantModel.findByIdAndUpdate(
      id,
      { stage },
     { returnDocument: "after" }
    ).lean();

    if (!applicant) return next(new ErrorHandler("Applicant not found", 404));

    res.status(200).json({ success: true, stage: applicant.stage });
  }
);

// controller — replace assignApplicant
export const assignApplicant = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id as any)) {
      return next(new ErrorHandler("Invalid applicant ID", 400));
    }

    if (assignedTo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(assignedTo)) {
        return next(new ErrorHandler("assignedTo must be a valid email address", 400));
      }
    }

    const applicant = await ApplicantModel.findByIdAndUpdate(
      id,
      { assignedTo: assignedTo || undefined },
      { returnDocument: "after" }
    ).lean();

    if (!applicant) return next(new ErrorHandler("Applicant not found", 404));

    if (assignedTo) {
      try {
        await sendMail({
          email: assignedTo,
          subject: `You've been assigned a candidate — ${applicant.name}`,
          template: "applicant-assigned.ejs",
          data: {
            candidateName: applicant.name,
            candidateEmail: applicant.email,
            position: (applicant as any).jobId ? undefined : "General submission",
            adminUrl: `${process.env.ADMIN_DASHBOARD_URL}/applicants`,
          },
        });
      } catch (mailError: any) {
        console.error("Assignment email failed:", mailError);
        // don't fail the request just because the notification email failed
      }
    }

    res.status(200).json({ success: true, assignedTo: applicant.assignedTo ?? null });
  }
);


export const addApplicantNote = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { text, author } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id as any)) {
      return next(new ErrorHandler("Invalid applicant ID", 400));
    }
    if (!text || !author) {
      return next(new ErrorHandler("Note text and author are required", 400));
    }

    const applicant = await ApplicantModel.findByIdAndUpdate(
      id,
      { $push: { notes: { text, author } } },
      { returnDocument: "after" }
    ).lean();

    if (!applicant) return next(new ErrorHandler("Applicant not found", 404));

    res.status(201).json({ success: true, notes: applicant.notes });
  }
);