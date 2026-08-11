import mongoose, { Schema, Document, Types } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────
// Shared value types
// ─────────────────────────────────────────────────────────────────────────

export type SelfServiceAccess = 'full_access' | 'no_access';

// ─────────────────────────────────────────────────────────────────────────
// Sub-documents — these back the effective-dated history tables you see on
// the "Job" tab (Employment Status, Compensation, Allowances, Job
// Information, Airport Security Pass, Bonus, Commission, Equity).
// Every "Add Entry" button on that tab pushes one of these.
// ─────────────────────────────────────────────────────────────────────────

export interface EmploymentStatusEntry extends Types.Subdocument {
  effective_date: Date;
  employment_status: string; // e.g. "Probation Full-time", "Full-time", "Terminated"
  comment?: string;
}

export interface CompensationEntry extends Types.Subdocument {
  effective_date: Date;
  pay_schedule: string;      // e.g. "Every other week"
  pay_type: string;          // e.g. "Salary", "Hourly"
  pay_rate_amount: number;
  pay_rate_currency: string; // e.g. "XCD"
  pay_rate_per: string;      // e.g. "Pay Period", "Hour", "Year"
  overtime?: string;
  change_reason?: string;
  comment?: string;
}

export interface AllowanceEntry extends Types.Subdocument {
  effective_date: Date;
  phone?: number;
  travel?: number;
  housing?: number;
  electricity?: number;
  acting?: number;
  additional_duties?: number;
  shift_leader?: number;
  call_out?: number;
  other?: number;
  currency: string; // e.g. "XCD"
}

export interface JobInformationEntry extends Types.Subdocument {
  effective_date: Date;
  location?: string;
  division?: string;
  department?: string;
  teams?: string;
  job_title: string;
  reports_to?: mongoose.Types.ObjectId; // ref: Employee
}

export interface AirportSecurityPassEntry extends Types.Subdocument {
  issue_date: Date;
  expiration_date: Date;
  comments?: string;
}

export interface BonusEntry extends Types.Subdocument {
  date: Date;
  amount: number;
  reason?: string;
  comment?: string;
}

export interface CommissionEntry extends Types.Subdocument {
  date: Date;
  amount: number;
  comment?: string;
}

export interface EquityEntry extends Types.Subdocument {
  grant_type: string;
  custom_grant_type_name?: string;
  grant_date: Date;
  vesting_start_date?: Date;
  equity_granted: number;
  strike_price?: number;
  vesting_schedule?: string;
  vesting_months?: number;
  cliff_months?: number;
}

const employmentStatusSchema = new Schema<EmploymentStatusEntry>(
  {
    effective_date: { type: Date, required: true },
    employment_status: { type: String, required: true, trim: true },
    comment: { type: String, trim: true },
  },
  { timestamps: false },
);

const compensationSchema = new Schema<CompensationEntry>(
  {
    effective_date: { type: Date, required: true },
    pay_schedule: { type: String, required: true, trim: true },
    pay_type: { type: String, required: true, trim: true },
    pay_rate_amount: { type: Number, required: true, min: 0 },
    pay_rate_currency: { type: String, required: true, trim: true, default: 'XCD' },
    pay_rate_per: { type: String, required: true, trim: true },
    overtime: { type: String, trim: true },
    change_reason: { type: String, trim: true },
    comment: { type: String, trim: true },
  },
  { timestamps: false },
);

const allowanceSchema = new Schema<AllowanceEntry>(
  {
    effective_date: { type: Date, required: true },
    phone: { type: Number, min: 0 },
    travel: { type: Number, min: 0 },
    housing: { type: Number, min: 0 },
    electricity: { type: Number, min: 0 },
    acting: { type: Number, min: 0 },
    additional_duties: { type: Number, min: 0 },
    shift_leader: { type: Number, min: 0 },
    call_out: { type: Number, min: 0 },
    other: { type: Number, min: 0 },
    currency: { type: String, required: true, trim: true, default: 'XCD' },
  },
  { timestamps: false },
);

const jobInformationSchema = new Schema<JobInformationEntry>(
  {
    effective_date: { type: Date, required: true },
    location: { type: String, trim: true },
    division: { type: String, trim: true },
    department: { type: String, trim: true },
    teams: { type: String, trim: true },
    job_title: { type: String, required: true, trim: true },
    reports_to: { type: Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: false },
);

const airportSecurityPassSchema = new Schema<AirportSecurityPassEntry>(
  {
    issue_date: { type: Date, required: true },
    expiration_date: { type: Date, required: true },
    comments: { type: String, trim: true },
  },
  { timestamps: false },
);

const bonusSchema = new Schema<BonusEntry>(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
    comment: { type: String, trim: true },
  },
  { timestamps: false },
);

const commissionSchema = new Schema<CommissionEntry>(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    comment: { type: String, trim: true },
  },
  { timestamps: false },
);

const equitySchema = new Schema<EquityEntry>(
  {
    grant_type: { type: String, required: true, trim: true },
    custom_grant_type_name: { type: String, trim: true },
    grant_date: { type: Date, required: true },
    vesting_start_date: { type: Date },
    equity_granted: { type: Number, required: true, min: 0 },
    strike_price: { type: Number, min: 0 },
    vesting_schedule: { type: String, trim: true },
    vesting_months: { type: Number, min: 0 },
    cliff_months: { type: Number, min: 0 },
  },
  { timestamps: false },
);

// ─────────────────────────────────────────────────────────────────────────
// Main Employee document
// ─────────────────────────────────────────────────────────────────────────

export interface EmployeeDocument extends Document {
  // Personal
  employee_number?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  birth_date?: Date;
  gender?: string;
  marital_status?: string;

  // Address
  street1?: string;
  street2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;

  // Contact
  work_phone?: string;
  work_phone_ext?: string;
  mobile_phone?: string;
  home_phone?: string;
  work_email?: string;
  home_email?: string;

  // Job (current/core fields shown at the top of the Job tab)
  hire_date?: Date;
  job_code?: string;
  probation_end_date?: Date;
  contract_end_date?: Date;
  contracted_hours_per_week?: number;
  contracted_days_per_week?: number;

  // Self-service access
  self_service_access: SelfServiceAccess;

  // Effective-dated history tables (Job tab)
  employment_status_history: Types.DocumentArray<EmploymentStatusEntry>;
  compensation_history: Types.DocumentArray<CompensationEntry>;
  allowances_history: Types.DocumentArray<AllowanceEntry>;
  job_information_history: Types.DocumentArray<JobInformationEntry>;
  airport_security_pass_history: Types.DocumentArray<AirportSecurityPassEntry>;
  bonus_history: Types.DocumentArray<BonusEntry>;
  commission_history: Types.DocumentArray<CommissionEntry>;
  equity_history: Types.DocumentArray<EquityEntry>;

  // Single-value panels (not history tables in the screenshots)
  pay_rates?: {
    daily?: number;
    holiday?: number;
    sick?: number;
    vacation_pay_in_lieu_rate?: number;
  };
  potential_bonus?: {
    annual_percentage?: number;
    annual_amount?: number;
    annual_amount_currency?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<EmployeeDocument>(
  {
    // Personal
    employee_number: { type: String, trim: true, index: true },
    first_name: { type: String, required: true, trim: true, maxlength: 100 },
    middle_name: { type: String, trim: true, maxlength: 100 },
    last_name: { type: String, required: true, trim: true, maxlength: 100 },
    preferred_name: { type: String, trim: true, maxlength: 100 },
    birth_date: { type: Date },
    gender: { type: String, trim: true },
    marital_status: { type: String, trim: true },

    // Address
    street1: { type: String, trim: true },
    street2: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    postal_code: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Antigua and Barbuda' },

    // Contact
    work_phone: { type: String, trim: true },
    work_phone_ext: { type: String, trim: true },
    mobile_phone: { type: String, trim: true },
    home_phone: { type: String, trim: true },
    work_email: { type: String, trim: true, lowercase: true },
    home_email: { type: String, trim: true, lowercase: true },

    // Job (core)
    hire_date: { type: Date },
    job_code: { type: String, trim: true },
    probation_end_date: { type: Date },
    contract_end_date: { type: Date },
    contracted_hours_per_week: { type: Number, min: 0 },
    contracted_days_per_week: { type: Number, min: 0, max: 7 },

    // Self-service access
    self_service_access: { type: String, enum: ['full_access', 'no_access'], default: 'no_access' },

    // History tables
    employment_status_history: { type: [employmentStatusSchema], default: [] },
    compensation_history: { type: [compensationSchema], default: [] },
    allowances_history: { type: [allowanceSchema], default: [] },
    job_information_history: { type: [jobInformationSchema], default: [] },
    airport_security_pass_history: { type: [airportSecurityPassSchema], default: [] },
    bonus_history: { type: [bonusSchema], default: [] },
    commission_history: { type: [commissionSchema], default: [] },
    equity_history: { type: [equitySchema], default: [] },

    // Single-value panels
    pay_rates: {
      daily: { type: Number, min: 0 },
      holiday: { type: Number, min: 0 },
      sick: { type: Number, min: 0 },
      vacation_pay_in_lieu_rate: { type: Number, min: 0 },
    },
    potential_bonus: {
      annual_percentage: { type: Number, min: 0, max: 100 },
      annual_amount: { type: Number, min: 0 },
      annual_amount_currency: { type: String, trim: true, default: 'XCD' },
    },
  },
  { timestamps: true },
);

// Handy for the employee list / search
employeeSchema.index({ first_name: 'text', last_name: 'text', preferred_name: 'text', work_email: 'text' });

export const EmployeeModel = mongoose.model<EmployeeDocument>('Employee', employeeSchema);