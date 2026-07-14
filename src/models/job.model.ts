import mongoose, { Schema, Document, Model } from 'mongoose';

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Seasonal' | 'Internship';
export type JobStatus = 'open' | 'closed' | 'draft';



// Shape returned to the client (matches the toJob() mapper in job.service.ts)
export interface Job {
  id: string;
  restaurant_id: string;
  restaurant_name?: string; 
  position: string;
  title: string;
  department?: string;
  employment_type: EmploymentType;
  description: string;
  requirements: string[];
  responsibilities: string[];
  keywords: string[];
  contact_email: string;
  contact_phone: string;
  location?: string;

  status: JobStatus;
  closing_date?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobDto {
  restaurant_id: string;
  position: string;
  title: string;
  department?: string;
  employment_type?: EmploymentType;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  keywords?: string[];
  contact_email: string;
  contact_phone: string;
  location?: string;

  status?: JobStatus;
  closing_date?: Date;
}

interface JobDocument extends Document {
  restaurant_id: mongoose.Types.ObjectId;
  position: string;
  title: string; 
  department?: string;
  employment_type: EmploymentType;
  description: string;
  requirements: string[];
  responsibilities: string[];
  keywords: string[];
  contact_email: string;
  contact_phone: string;
  location?: string;

  status: JobStatus;
  closing_date?: Date;
}

const jobSchema = new Schema<JobDocument>(
  {
    restaurant_id: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    position: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true }, 
    department: { type: String, trim: true },
    employment_type: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Seasonal', 'Internship'],
      default: 'Full-time',
    },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    keywords: {
      type: [String],
      default: [],
      set: (arr: string[]) => (Array.isArray(arr) ? arr.map((k) => k.toLowerCase().trim()) : arr),
    },
    contact_email: { type: String, required: true, lowercase: true, trim: true },
    contact_phone: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
   
    status: { type: String, enum: ['open', 'closed', 'draft'], default: 'open' },
    closing_date: { type: Date },
  },
  { timestamps: true },
);

// Powers the `search` query param in JobService.getAll()
jobSchema.index({ position: 'text', keywords: 'text', description: 'text' });

export const JobModel: Model<JobDocument> = mongoose.model<JobDocument>('Job', jobSchema);