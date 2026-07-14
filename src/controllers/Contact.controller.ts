import { Request, Response } from "express";

import sendMail from "../utils/sendMail";
import ContactSubmission from "../models/ContactSubmission";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export const submitContact = async (req: Request, res: Response) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim();
    const message = String(req.body.message || "").trim();

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required.",
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    const submission = await ContactSubmission.create({ name, email, message });

    // Don't fail the request if the email fails — submission is already saved.
    try {
      await sendMail({
        email: process.env.CONTACT_NOTIFICATION_EMAIL || (process.env.SMTP_USER as string),
        subject: `New contact submission from ${name}`,
        template: "contact-notification.ejs",
        replyTo: email,
        data: {
          name,
          email,
          message,
          submittedAt: new Date().toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
          dashboardUrl: `${process.env.APP_URL}/dashboard/contact`,
        },
      });
    } catch (emailErr) {
      console.error("Contact notification email failed:", emailErr);
    }

    return res.status(201).json({ success: true, data: submission });
  } catch (error) {
    console.error("submitContact error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};


export const getContacts = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const filter = status ? { status } : {};

    const [submissions, total] = await Promise.all([
      ContactSubmission.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ContactSubmission.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getContacts error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch submissions.",
    });
  }
};

// ─── GET /api/contact/:id ───────────────────────────────────────────────────
export const getContactById = async (req: Request, res: Response) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }
    return res.status(200).json({ success: true, data: submission });
  } catch (error) {
    console.error("getContactById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch submission." });
  }
};

// ─── PATCH /api/contact/:id/status ─────────────────────────────────────────
export const updateContactStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!["new", "read", "responded"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const submission = await ContactSubmission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    return res.status(200).json({ success: true, data: submission });
  } catch (error) {
    console.error("updateContactStatus error:", error);
    return res.status(500).json({ success: false, message: "Failed to update status." });
  }
};