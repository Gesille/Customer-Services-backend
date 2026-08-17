import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";

import dotenv from "dotenv";

dotenv.config();



// ─── Single shared transporter ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailOptions {
  email: string | string[];   
  subject: string;
  template: string;          
  data: { [key: string]: any };
  replyTo?: string;
   attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

// ─── Main sendMail function ───────────────────────────────────────────────────
const sendMail = async (options: EmailOptions): Promise<void> => {
  const { email, subject, template, data, replyTo, attachments } = options;
  const recipients = Array.isArray(email) ? email : [email];
  const maskedRecipients = recipients.map((value) => {
    const [name, domain] = value.split("@");
    return `${name?.slice(0, 2) || "***"}***@${domain || "unknown"}`;
  });

  const templatePath = path.join(__dirname, "../mails", template);
  console.log("[EMAIL][START]", {
    template,
    templatePath,
    subject,
    recipients: maskedRecipients,
    smtpHost: process.env.SMTP_HOST || "MISSING",
    smtpPort: process.env.SMTP_PORT || "MISSING",
    smtpUserConfigured: Boolean(process.env.SMTP_USER),
    smtpPasswordConfigured: Boolean(process.env.SMTP_PASS),
  });

  try {
    console.log("[EMAIL][TEMPLATE_RENDER_START]", { templatePath });
    const html = await ejs.renderFile(templatePath, data);
    console.log("[EMAIL][TEMPLATE_RENDER_SUCCESS]", {
      template,
      htmlLength: html.length,
    });

    console.log("[EMAIL][SMTP_SEND_START]", { recipients: maskedRecipients, subject });
    await transporter.sendMail({

    from:    `"Next International" <${process.env.SMTP_USER}>`,
    to:      Array.isArray(email) ? email.join(",") : email,
    subject,
    html,
    attachments,
    ...(replyTo ? { replyTo } : {}),
    });

    console.log("[EMAIL][SMTP_SEND_SUCCESS]", {
      recipients: maskedRecipients,
      subject,
      template,
    });
  } catch (error: any) {
    console.error("[EMAIL][FAILED]", {
      template,
      templatePath,
      recipients: maskedRecipients,
      subject,
      errorName: error?.name,
      errorCode: error?.code,
      errorCommand: error?.command,
      errorResponseCode: error?.responseCode,
      errorMessage: error?.message,
      stack: error?.stack,
    });
    throw error;
  }
};

export default sendMail;