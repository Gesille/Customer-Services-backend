import mongoose from 'mongoose';
import { ApplicantModel } from '../models/applicant.model';

export interface ResumeFile {
  name: string;
  mimetype: string;
  data: Buffer;
}

export interface CreateApplicantDto {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  linkedin?: string;
  jobId: string;
  resume: ResumeFile;
}

export interface ApplicantSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  linkedin?: string;
   job?: string | null;  
  jobId?: string;
  stage: string;
  assignedTo?: string;
  attachments: { id: string; name: string; mimetype: string; createdAt: Date }[];
  createdAt: Date;
}

// Never leak the raw file Buffer in list/detail responses — attachments are
// downloaded separately via getAttachment().
function toApplicant(doc: any): ApplicantSummary {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    message: doc.message,
    linkedin: doc.linkedin,
    job: doc.jobId?.title ?? null,    
    jobId: doc.jobId?._id?.toString() ?? doc.jobId, 
    stage: doc.stage,
    assignedTo: doc.assignedTo,
    attachments: (doc.attachments || []).map((a: any) => ({
      id: a._id.toString(),
      name: a.name,
      mimetype: a.mimetype,
      createdAt: a.createdAt,
    })),
    createdAt: doc.createdAt,
  };
}

export class ApplicantService {
  async create(dto: CreateApplicantDto): Promise<string> {
    const doc = await ApplicantModel.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      message: dto.message,
      linkedin: dto.linkedin,
      jobId: dto.jobId,
      attachments: [dto.resume],
    });
    return doc._id.toString();
  }

  async getByJob(jobId: string): Promise<ApplicantSummary[]> {
    const docs = await ApplicantModel.find({ jobId })
      .populate("jobId", "title")  
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(toApplicant);
  }

  async getById(id: string): Promise<ApplicantSummary | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await ApplicantModel.findById(id).lean();
    return doc ? toApplicant(doc) : null;
  }

  async getAttachment(
    applicantId: string,
    attachmentId: string,
  ): Promise<{ name: string; mimetype: string; data: Buffer } | null> {
    if (!mongoose.Types.ObjectId.isValid(applicantId)) return null;
    const doc = await ApplicantModel.findById(applicantId).lean();
    if (!doc) return null;
    const attachment = (doc.attachments || []).find((a: any) => a._id.toString() === attachmentId);
    return attachment ? { name: attachment.name, mimetype: attachment.mimetype, data: attachment.data } : null;
  }
}

export const applicantService = new ApplicantService();