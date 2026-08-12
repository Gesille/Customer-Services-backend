import mongoose from 'mongoose';
import { SelfServiceAccess, EmployeeDocument, EmployeeModel } from '../models/Employee.model';

// ─────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────

export interface CreateEmployeeDto {
  employee_number?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  birth_date?: Date;
  gender?: string;
  marital_status?: string;

  street1?: string;
  street2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;

  hire_date?: Date;

  work_phone?: string;
  work_phone_ext?: string;
  mobile_phone?: string;
  home_phone?: string;
  work_email?: string;
  home_email?: string;

  employment_status?: string;

  job_title?: string;
  reports_to?: string;
  department?: string;
  division?: string;
  location?: string;

  pay_schedule?: string;
  pay_type?: string;
  pay_rate_amount?: number;
  pay_rate_currency?: string;
  pay_rate_per?: string;

  self_service_access?: SelfServiceAccess;
}

// Basic info panel — everything editable in place (Personal / Address / Contact / Access)
export interface UpdateBasicInfoDto {
  employee_number?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  preferred_name?: string;
  birth_date?: Date;
  gender?: string;
  marital_status?: string;

  street1?: string;
  street2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;

  work_phone?: string;
  work_phone_ext?: string;
  mobile_phone?: string;
  home_phone?: string;
  work_email?: string;
  home_email?: string;

  self_service_access?: SelfServiceAccess;
}

export interface EmployeeSummary {
  id: string;
  employee_number?: string;
  full_name: string;
  preferred_name?: string;
  job_title?: string;
  department?: string;
  division?: string;
  location?: string;
  employment_status?: string;
  work_email?: string;
  hire_date?: Date;
  self_service_access: SelfServiceAccess;
}

// Full raw field set, so the edit form can prefill everything.
export interface EmployeeVitals {
  employee_number?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  birth_date?: Date;
  gender?: string;
  marital_status?: string;

  street1?: string;
  street2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  address?: string; // derived display string

  work_phone?: string;
  work_phone_ext?: string;
  mobile_phone?: string;
  home_phone?: string;
  work_email?: string;
  home_email?: string;

  self_service_access: SelfServiceAccess;

  job_title?: string;
  employment_status?: string;
  department?: string;
  company_name?: string;
  hire_date?: Date;
  tenure_days?: number;
  manager?: { id: string; name: string; job_title?: string } | null;
}

export interface EffectiveDatedResult<T> {
  current?: T;
  history: T[];
  future: T[];
}

export interface EmployeeJobTab {
  job: {
    hire_date?: Date;
    job_code?: string;
    direct_reports_count: number;
    probation_end_date?: Date;
    probation_pending?: boolean;
    contract_end_date?: Date;
    contracted_hours_per_week?: number;
    contracted_days_per_week?: number;
  };
  employment_status: EffectiveDatedResult<any>;
  compensation: EffectiveDatedResult<any>;
  allowances: EffectiveDatedResult<any>;
  job_information: EffectiveDatedResult<any>;
  pay_rates?: EmployeeDocument['pay_rates'];
  airport_security_pass_history: any[];
  potential_bonus?: EmployeeDocument['potential_bonus'];
  bonus_history: any[];
  commission_history: any[];
  equity_history: any[];
}

export interface EmployeeProfile {
  id: string;
  full_name: string;
  vitals: {
    employee_number?: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    preferred_name?: string;
    birth_date?: string;
    gender?: string;
    marital_status?: string;

    street1?: string;
    street2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
    address?: string;

    work_phone?: string;
    work_phone_ext?: string;
    mobile_phone?: string;
    home_phone?: string;
    work_email?: string;
    home_email?: string;

    self_service_access: "full_access" | "no_access";

    job_title?: string;
    employment_status?: string;
    department?: string;
    company_name?: string;
    hire_date?: string;
    tenure_days?: number;
    manager?: { id: string; name: string; job_title?: string } | null;
  };
  job_tab: {
    job: {
      hire_date?: string;
      job_code?: string;
      direct_reports_count: number;
      probation_end_date?: string;
      probation_pending?: boolean;
      contract_end_date?: string;
      contracted_hours_per_week?: number;
      contracted_days_per_week?: number;
    };
    employment_status: { current?: any; history: any[]; future: any[] };
    compensation: { current?: any; history: any[]; future: any[] };
    allowances: { current?: any; history: any[]; future: any[] };
    job_information: { current?: any; history: any[]; future: any[] };
    pay_rates?: any;
    airport_security_pass_history: any[];
    potential_bonus?: any;
    bonus_history: any[];
    commission_history: any[];
    equity_history: any[];
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function fullName(doc: any): string {
  return [doc.first_name, doc.last_name].filter(Boolean).join(' ');
}

function splitEffectiveDated<T extends Record<string, any>>(
  entries: T[],
  dateField: string,
): EffectiveDatedResult<T> {
  const now = Date.now();
  const sorted = [...(entries || [])].sort(
    (a, b) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime(),
  );

  const past = sorted.filter((e) => new Date(e[dateField]).getTime() <= now);
  const future = sorted.filter((e) => new Date(e[dateField]).getTime() > now);

  const current = past.length ? past[past.length - 1] : undefined;
  const history = past.slice(0, -1).reverse();

  return { current, history, future };
}

function tenureDays(hireDate?: Date): number | undefined {
  if (!hireDate) return undefined;
  const ms = Date.now() - new Date(hireDate).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function toSummary(doc: any): EmployeeSummary {
  const currentStatus = splitEffectiveDated(doc.employment_status_history || [], 'effective_date').current;
  const currentJobInfo = splitEffectiveDated(doc.job_information_history || [], 'effective_date').current;

  return {
    id: doc._id.toString(),
    employee_number: doc.employee_number,
    full_name: fullName(doc),
    preferred_name: doc.preferred_name,
    job_title: currentJobInfo?.job_title,
    department: currentJobInfo?.department,
    division: currentJobInfo?.division,
    location: currentJobInfo?.location,
    employment_status: currentStatus?.employment_status,
    work_email: doc.work_email,
    hire_date: doc.hire_date,
    self_service_access: doc.self_service_access,
  };
}

async function toProfile(doc: any): Promise<EmployeeProfile> {
  const employmentStatus = splitEffectiveDated(doc.employment_status_history || [], 'effective_date');
  const compensation = splitEffectiveDated(doc.compensation_history || [], 'effective_date');
  const allowances = splitEffectiveDated(doc.allowances_history || [], 'effective_date');
  const jobInformation = splitEffectiveDated(doc.job_information_history || [], 'effective_date');
  const currentJobInfo = jobInformation.current;

  let manager: EmployeeVitals['manager'] = null;
  if (currentJobInfo?.reports_to) {
    const mgrDoc = await EmployeeModel.findById(currentJobInfo.reports_to).lean();
    if (mgrDoc) {
      const mgrCurrentJob = splitEffectiveDated(
        (mgrDoc as any).job_information_history || [],
        'effective_date',
      ).current;
      manager = {
        id: (mgrDoc as any)._id.toString(),
        name: fullName(mgrDoc),
        job_title: mgrCurrentJob?.job_title,
      };
    }
  }

  const directReportsCount = await EmployeeModel.countDocuments({
    'job_information_history.reports_to': doc._id,
  });

  const addressParts = [doc.street1, doc.city, doc.country].filter(Boolean);

  return {
    id: doc._id.toString(),
    full_name: fullName(doc),
    vitals: {
      employee_number: doc.employee_number,
      first_name: doc.first_name,
      middle_name: doc.middle_name,
      last_name: doc.last_name,
      preferred_name: doc.preferred_name,
      birth_date: doc.birth_date,
      gender: doc.gender,
      marital_status: doc.marital_status,

      street1: doc.street1,
      street2: doc.street2,
      city: doc.city,
      province: doc.province,
      postal_code: doc.postal_code,
      country: doc.country,
      address: addressParts.length ? addressParts.join(', ') : undefined,

      work_phone: doc.work_phone,
      work_phone_ext: doc.work_phone_ext,
      mobile_phone: doc.mobile_phone,
      home_phone: doc.home_phone,
      work_email: doc.work_email,
      home_email: doc.home_email,

      self_service_access: doc.self_service_access,

      job_title: currentJobInfo?.job_title,
      employment_status: employmentStatus.current?.employment_status,
      department: currentJobInfo?.department,
      company_name: currentJobInfo?.division,
      hire_date: doc.hire_date,
      tenure_days: tenureDays(doc.hire_date),
      manager,
    },
    job_tab: {
   job: {
  hire_date: doc.hire_date,
  job_code: doc.job_code,
  direct_reports_count: directReportsCount,
  probation_end_date: doc.probation_end_date,
  probation_pending: Boolean(
    doc.probation_end_date &&
    new Date(doc.probation_end_date).getTime() <= Date.now() &&
    employmentStatus.current?.employment_status?.toLowerCase().includes('probation'),
  ),
  contract_end_date: doc.contract_end_date,
  contracted_hours_per_week: doc.contracted_hours_per_week,
  contracted_days_per_week: doc.contracted_days_per_week,
},
      employment_status: employmentStatus,
      compensation,
      allowances,
      job_information: jobInformation,
      pay_rates: doc.pay_rates,
      airport_security_pass_history: [...(doc.airport_security_pass_history || [])].sort(
        (a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime(),
      ),
      potential_bonus: doc.potential_bonus,
      bonus_history: [...(doc.bonus_history || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      commission_history: [...(doc.commission_history || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      equity_history: [...(doc.equity_history || [])].sort(
        (a, b) => new Date(b.grant_date).getTime() - new Date(a.grant_date).getTime(),
      ),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────

export class EmployeeService {
  async create(dto: CreateEmployeeDto): Promise<string> {
    const doc = await EmployeeModel.create({
      employee_number: dto.employee_number,
      first_name: dto.first_name,
      middle_name: dto.middle_name,
      last_name: dto.last_name,
      preferred_name: dto.preferred_name,
      birth_date: dto.birth_date,
      gender: dto.gender,
      marital_status: dto.marital_status,

      street1: dto.street1,
      street2: dto.street2,
      city: dto.city,
      province: dto.province,
      postal_code: dto.postal_code,
      country: dto.country,

      hire_date: dto.hire_date,

      work_phone: dto.work_phone,
      work_phone_ext: dto.work_phone_ext,
      mobile_phone: dto.mobile_phone,
      home_phone: dto.home_phone,
      work_email: dto.work_email,
      home_email: dto.home_email,

      self_service_access: dto.self_service_access || 'no_access',

    probation_end_date: dto.hire_date ? addMonths(dto.hire_date, 4) : undefined,

  employment_status_history: dto.hire_date || dto.employment_status
    ? [{
        effective_date: dto.hire_date || new Date(),
        employment_status: dto.employment_status || 'Probation Full-time',
      }]
    : [],

      job_information_history: dto.job_title
        ? [
            {
              effective_date: dto.hire_date || new Date(),
              job_title: dto.job_title,
              reports_to: dto.reports_to,
              department: dto.department,
              division: dto.division,
              location: dto.location,
            },
          ]
        : [],

      compensation_history:
        dto.pay_schedule && dto.pay_type && dto.pay_rate_amount !== undefined
          ? [
              {
                effective_date: dto.hire_date || new Date(),
                pay_schedule: dto.pay_schedule,
                pay_type: dto.pay_type,
                pay_rate_amount: dto.pay_rate_amount,
                pay_rate_currency: dto.pay_rate_currency || 'XCD',
                pay_rate_per: dto.pay_rate_per || 'Pay Period',
              },
            ]
          : [],
    });

    return doc._id.toString();
  }

  async getAll(search?: string): Promise<EmployeeSummary[]> {
    const query: Record<string, any> = search ? { $text: { $search: search } } : {};
    const docs = await EmployeeModel.find(query).sort({ createdAt: -1 }).lean();
    return docs.map(toSummary);
  }

  async getById(id: string): Promise<EmployeeProfile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await EmployeeModel.findById(id).lean();
    return doc ? toProfile(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const doc = await EmployeeModel.findByIdAndDelete(id);
    return Boolean(doc);
  }

  // ── Basic info panel — Personal / Address / Contact / Access, all flat fields ──
  async updateBasicInfo(id: string, data: UpdateBasicInfoDto): Promise<EmployeeProfile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await EmployeeModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    return doc ? toProfile(doc) : null;
  }

  // ── Core Job panel ─────────────────────────────────────────────────────
  async resolveProbation(
  id: string,
  input: { passed: boolean; effective_date?: Date; new_status?: string; comment?: string },
): Promise<EmployeeProfile | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const employment_status = input.passed ? (input.new_status || 'Full-time') : 'Terminated';

  return this.pushEntry(id, 'employment_status_history', {
    effective_date: input.effective_date || new Date(),
    employment_status,
    comment: input.comment || (input.passed ? 'Probation passed' : 'Probation not passed'),
  });
}

async getPendingProbationReviews(): Promise<EmployeeSummary[]> {
  const now = new Date();
  const docs = await EmployeeModel.find({ probation_end_date: { $ne: null, $lte: now } }).lean();

  const pending = docs.filter((doc: any) => {
    const current = splitEffectiveDated(doc.employment_status_history || [], 'effective_date').current;
    return current?.employment_status?.toLowerCase().includes('probation');
  });

  return pending.map(toSummary);
}

 async updateJobCore(
  id: string,
  data: Partial<Pick<EmployeeDocument, 'hire_date' | 'job_code' | 'probation_end_date' | 'contract_end_date' | 'contracted_hours_per_week' | 'contracted_days_per_week'>>,
): Promise<EmployeeProfile | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  if (data.hire_date && data.probation_end_date === undefined) {
    data.probation_end_date = addMonths(data.hire_date, 4);
  }

  const doc = await EmployeeModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  return doc ? toProfile(doc) : null;
}

  async addEmploymentStatusEntry(id: string, entry: { effective_date: Date; employment_status: string; comment?: string }) {
    return this.pushEntry(id, 'employment_status_history', entry);
  }

  async addCompensationEntry(
    id: string,
    entry: {
      effective_date: Date;
      pay_schedule: string;
      pay_type: string;
      pay_rate_amount: number;
      pay_rate_currency?: string;
      pay_rate_per: string;
      overtime?: string;
      change_reason?: string;
      comment?: string;
    },
  ) {
    return this.pushEntry(id, 'compensation_history', {
      ...entry,
      pay_rate_currency: entry.pay_rate_currency || 'XCD',
    });
  }

  async addAllowanceEntry(
    id: string,
    entry: {
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
      currency?: string;
    },
  ) {
    return this.pushEntry(id, 'allowances_history', { ...entry, currency: entry.currency || 'XCD' });
  }

  async addJobInformationEntry(
    id: string,
    entry: {
      effective_date: Date;
      location?: string;
      division?: string;
      department?: string;
      teams?: string;
      job_title: string;
      reports_to?: string;
    },
  ) {
    return this.pushEntry(id, 'job_information_history', entry);
  }

  async addAirportSecurityPassEntry(id: string, entry: { issue_date: Date; expiration_date: Date; comments?: string }) {
    return this.pushEntry(id, 'airport_security_pass_history', entry);
  }

  async addBonusEntry(id: string, entry: { date: Date; amount: number; reason?: string; comment?: string }) {
    return this.pushEntry(id, 'bonus_history', entry);
  }

  async addCommissionEntry(id: string, entry: { date: Date; amount: number; comment?: string }) {
    return this.pushEntry(id, 'commission_history', entry);
  }

  async addEquityEntry(
    id: string,
    entry: {
      grant_type: string;
      custom_grant_type_name?: string;
      grant_date: Date;
      vesting_start_date?: Date;
      equity_granted: number;
      strike_price?: number;
      vesting_schedule?: string;
      vesting_months?: number;
      cliff_months?: number;
    },
  ) {
    return this.pushEntry(id, 'equity_history', entry);
  }

  async updatePayRates(
    id: string,
    payRates: { daily?: number; holiday?: number; sick?: number; vacation_pay_in_lieu_rate?: number },
  ): Promise<EmployeeProfile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await EmployeeModel.findByIdAndUpdate(id, { pay_rates: payRates }, { new: true }).lean();
    return doc ? toProfile(doc) : null;
  }

  async updatePotentialBonus(
    id: string,
    potentialBonus: { annual_percentage?: number; annual_amount?: number; annual_amount_currency?: string },
  ): Promise<EmployeeProfile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await EmployeeModel.findByIdAndUpdate(
      id,
      { potential_bonus: { annual_amount_currency: 'XCD', ...potentialBonus } },
      { new: true },
    ).lean();
    return doc ? toProfile(doc) : null;
  }

  private async pushEntry(id: string, field: string, entry: Record<string, any>): Promise<EmployeeProfile | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await EmployeeModel.findByIdAndUpdate(
      id,
      { $push: { [field]: entry } },
      { new: true, runValidators: true },
    ).lean();
    return doc ? toProfile(doc) : null;
  }
}

export const employeeService = new EmployeeService();