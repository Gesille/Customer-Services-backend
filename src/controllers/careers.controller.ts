import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../middleware/ErrorHandler";
import { odooRequest } from "../odoo/odoo-client";

export const submitCV = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, message, cvFile, cvFileName } = req.body;
      // cvFile = base64 string (no data: prefix, or strip it), cvFileName = "resume.pdf"

      if (!name || !email || !cvFile) {
        return next(new ErrorHandler("Name, email, and CV are required", 400));
      }

      // 1. find or create partner
      const existingPartners = await odooRequest("res.partner", "search_read", [
        [["email", "=", email]],
        ["id"],
      ]);

      let partnerId: number;
      if (existingPartners.length > 0) {
        partnerId = existingPartners[0].id;
      } else {
        partnerId = await odooRequest("res.partner", "create", [
          { name, email },
        ]);
      }
const models = await odooRequest("ir.model", "search_read", [
  [["model", "=", "hr.applicant"]],
  ["model", "name"],
]);
console.log("models:", models);
      // 2. create the applicant record
      const applicantId = await odooRequest("hr.applicant", "create", [
        {
          partner_name: name,
          email_from: email,
          partner_id: partnerId,
          description: message || "",
        },
      ]);

      // 3. attach the CV
      const base64Data = cvFile.includes(",") ? cvFile.split(",")[1] : cvFile;

      await odooRequest("ir.attachment", "create", [
        {
          name: cvFileName || `CV_${name}.pdf`,
          datas: base64Data,
          res_model: "hr.applicant",
          res_id: applicantId,
        },
      ]);

      res.status(201).json({
        success: true,
        message: "CV submitted successfully",
      });
    } catch (error: any) {
      console.error("CV submission error:", error);
      return next(new ErrorHandler(error.message || "Failed to submit CV", 500));
    }
  }
);