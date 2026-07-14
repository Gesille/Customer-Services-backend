import mongoose, { Schema, Document, Types } from 'mongoose';

export interface AttachmentSubdocument extends Types.Subdocument {
  name:      string;
  mimetype:  string;
  data:      Buffer;
  createdAt: Date;
}

export interface NoteSubdocument extends Types.Subdocument {
  text:      string;
  author:    string;
  createdAt: Date;
}

export const STAGES = [
  'New',
  'Reviewing',
  'Interview Scheduled',
  'Second Interview',
  'Offered',
  'Rejected',
  'Hired',
] as const;

export interface ApplicantDocument extends Document {
  name:        string;
  email:       string;
  phone?:      string;
  message?:    string;
  linkedin?:   string;
  jobId?:      string;
  stage:       string;
  assignedTo?: string;
  notes:       Types.DocumentArray<NoteSubdocument>;
  attachments: Types.DocumentArray<AttachmentSubdocument>;
  stageHistory: Types.DocumentArray<StageHistoryEntry>;
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

const noteSchema = new Schema<NoteSubdocument>(
  {
    text:   { type: String, required: true },
    author: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export interface StageHistoryEntry extends Types.Subdocument {
  stage: string;
  changedBy: string;
  changedAt: Date;
}

const stageHistorySchema = new Schema<StageHistoryEntry>(
  {
    stage: { type: String, required: true },
    changedBy: { type: String, default: 'HR' },
  },
  { timestamps: { createdAt: 'changedAt', updatedAt: false } },
);

const applicantSchema = new Schema<ApplicantDocument>(
  {
    name:        { type: String, required: true, trim: true },
    email:       { type: String, required: true, trim: true, lowercase: true, index: true },
    phone:       { type: String },
    message:     { type: String },
    linkedin:    { type: String },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    stage:       { type: String, enum: STAGES, default: 'New', index: true },
    assignedTo:  { type: String },
    notes:       { type: [noteSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    stageHistory: { type: [stageHistorySchema], default: [] },
  },
  { timestamps: true },
);

export const ApplicantModel = mongoose.model<ApplicantDocument>('Applicant', applicantSchema);