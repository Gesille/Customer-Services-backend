import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../middleware/ErrorHandler";
import { odooRequest } from "../odoo/odoo-client";



// submitCV without careers
export const submitCV = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, message, cvFile, cvFileName, jobId, phone, linkedin } = req.body;

      if (!name || !email || !cvFile) {
        return next(new ErrorHandler("Name, email, and CV are required", 400));
      }

      const existingPartners = await odooRequest("res.partner", "search_read", [
        [["email", "=", email]],
        ["id"],
      ]);

      let partnerId: number;
      if (existingPartners.length > 0) {
        partnerId = existingPartners[0].id;
      } else {
        partnerId = await odooRequest("res.partner", "create", [{ name, email, phone: phone || false }]);
      }

      const applicantId = await odooRequest("hr.applicant", "create", [
        {
          partner_name: name,
          email_from: email,
          partner_id: partnerId,
          partner_phone: phone || false,
          applicant_notes: message || "",
          linkedin_profile: linkedin || false,
          ...(jobId ? { job_id: Number(jobId) } : {}), // <-- this is what makes it a "career" application
        },
      ]);

      const base64Data = cvFile.includes(",") ? cvFile.split(",")[1] : cvFile;

      await odooRequest("ir.attachment", "create", [
        {
          name: cvFileName || `CV_${name}.pdf`,
          datas: base64Data,
          res_model: "hr.applicant",
          res_id: applicantId,
        },
      ]);

      res.status(201).json({ success: true, message: "CV submitted successfully" });
    } catch (error: any) {
      console.error("CV submission error:", error);
      return next(new ErrorHandler(error.message || "Failed to submit CV", 500));
    }
  }
);

// get all CVs (for admin) without careers
export const getAllCVs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. fetch all applicants
      const applicants = await odooRequest("hr.applicant", "search_read", [
        [], // no filter = all applicants
        [
          "id",
          "partner_name",
          "email_from",
          "partner_phone",
          "applicant_notes",
          "stage_id",
          "job_id",
          "create_date",
        ],
      ]);

      if (applicants.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }

      const applicantIds = applicants.map((a: any) => a.id);

      // 2. fetch attachments (CVs) linked to these applicants
      const attachments = await odooRequest("ir.attachment", "search_read", [
        [
          ["res_model", "=", "hr.applicant"],
          ["res_id", "in", applicantIds],
        ],
        ["id", "name", "mimetype", "res_id", "create_date"],
      ]);

      // 3. merge attachments into their matching applicant
      const data = applicants.map((applicant: any) => ({
        id: applicant.id,
        name: applicant.partner_name,
        email: applicant.email_from,
        phone: applicant.partner_phone,
        message: applicant.applicant_notes,
        stage: applicant.stage_id ? applicant.stage_id[1] : null,
        job: applicant.job_id ? applicant.job_id[1] : null,
        submittedAt: applicant.create_date,
        cvFiles: attachments
          .filter((att: any) => att.res_id === applicant.id)
          .map((att: any) => ({
            id: att.id,
            name: att.name,
            mimetype: att.mimetype,
            // download link — see note below
            downloadUrl: `/api/v1/cv/${att.id}/download`,
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


// download CV file by attachment ID
export const downloadCV = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { attachmentId } = req.params;

      const [attachment] = await odooRequest("ir.attachment", "read", [
        [Number(attachmentId)],
        ["name", "datas", "mimetype"],
      ]);

      if (!attachment) {
        return next(new ErrorHandler("File not found", 404));
      }

      const buffer = Buffer.from(attachment.datas, "base64");

      res.setHeader("Content-Type", attachment.mimetype || "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.name}"`
      );
      res.send(buffer);
    } catch (error: any) {
      console.error("Download CV error:", error);
      return next(new ErrorHandler(error.message || "Failed to download CV", 500));
    }
  }
);