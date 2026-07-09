import mongoose, { Schema, Document, Types } from 'mongoose';

export interface AttachmentSubdocument extends Types.Subdocument {
  name:      string;
  mimetype:  string;
  data:      Buffer;
  createdAt: Date;
}

export interface ApplicantDocument extends Document {
  name:        string;
  email:       string;
  phone?:      string;
  message?:    string;
  linkedin?:   string;
  jobId?:      string;
  stage:       string;
  attachments: Types.DocumentArray<AttachmentSubdocument>;
  createdAt:   Date;
}

const attachmentSchema = new Schema<AttachmentSubdocument>(
  {
    name:     { type: String, required: true },
    mimetype: { type: String, default: 'application/pdf' },
    data:     { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const applicantSchema = new Schema<ApplicantDocument>(
  {
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, trim: true, lowercase: true, index: true },
    phone:       { type: String },
    message:     { type: String },
    linkedin:    { type: String },
    jobId:       { type: String },

    stage:       { type: String, default: 'New' },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { timestamps: true },
);

export const ApplicantModel = mongoose.model<ApplicantDocument>('Applicant', applicantSchema);