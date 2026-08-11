import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { errorResponse, successResponse } from '../models/response.model';
import { employeeService } from '../services/Employee.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidId = (id: unknown) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

export class EmployeeController {
  // ── GET /employees — "See all employees" ─────────────────────────────
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const employees = await employeeService.getAll(search);
      res.status(200).json(successResponse('Employees fetched', employees));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch employees', err.message));
    }
  }

  // ── GET /employees/:id — single employee profile (Vitals + Job tab) ──
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) {
        res.status(400).json(errorResponse('Invalid employee ID')); return;
      }

      const employee = await employeeService.getById(id as string);
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(200).json(successResponse('Employee fetched', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to fetch employee', err.message));
    }
  }

  // ── POST /employees — "New Employee" form ─────────────────────────────
  async create(req: Request, res: Response): Promise<void> {
    try {
      const body = { ...req.body };

      if (!body.first_name || !String(body.first_name).trim()) {
        res.status(400).json(errorResponse('First Name is required')); return;
      }
      if (!body.last_name || !String(body.last_name).trim()) {
        res.status(400).json(errorResponse('Last Name is required')); return;
      }
      if (body.work_email && !EMAIL_RE.test(body.work_email)) {
        res.status(400).json(errorResponse('Invalid work email format')); return;
      }
      if (body.home_email && !EMAIL_RE.test(body.home_email)) {
        res.status(400).json(errorResponse('Invalid home email format')); return;
      }
      if (body.reports_to && !isValidId(body.reports_to)) {
        res.status(400).json(errorResponse('Invalid Reports To employee ID')); return;
      }
      if (body.self_service_access && !['full_access', 'no_access'].includes(body.self_service_access)) {
        res.status(400).json(errorResponse('self_service_access must be "full_access" or "no_access"')); return;
      }

      const id = await employeeService.create({
        employee_number: body.employee_number ? String(body.employee_number).trim() : undefined,
        first_name: String(body.first_name).trim(),
        middle_name: body.middle_name ? String(body.middle_name).trim() : undefined,
        last_name: String(body.last_name).trim(),
        preferred_name: body.preferred_name ? String(body.preferred_name).trim() : undefined,
        birth_date: body.birth_date ? new Date(body.birth_date) : undefined,
        gender: body.gender,
        marital_status: body.marital_status,

        street1: body.street1,
        street2: body.street2,
        city: body.city,
        province: body.province,
        postal_code: body.postal_code,
        country: body.country,

        hire_date: body.hire_date ? new Date(body.hire_date) : undefined,

        work_phone: body.work_phone,
        work_phone_ext: body.work_phone_ext,
        mobile_phone: body.mobile_phone,
        home_phone: body.home_phone,
        work_email: body.work_email ? String(body.work_email).trim().toLowerCase() : undefined,
        home_email: body.home_email ? String(body.home_email).trim().toLowerCase() : undefined,

        employment_status: body.employment_status,

        job_title: body.job_title,
        reports_to: body.reports_to,
        department: body.department,
        division: body.division,
        location: body.location,

        pay_schedule: body.pay_schedule,
        pay_type: body.pay_type,
        pay_rate_amount: body.pay_rate_amount !== undefined ? Number(body.pay_rate_amount) : undefined,
        pay_rate_currency: body.pay_rate_currency,
        pay_rate_per: body.pay_rate_per,

        self_service_access: body.self_service_access || 'no_access',
      });

      res.status(201).json(successResponse('Employee created', { id }));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to create employee', err.message));
    }
  }

  // ── DELETE /employees/:id ─────────────────────────────────────────────
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const deleted = await employeeService.delete(id as string);
      if (!deleted) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(200).json(successResponse('Employee deleted'));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to delete employee', err.message));
    }
  }

  // ── PUT /employees/:id/job/core — Hire Date / Job Code / Probation / Contract / Contracted Hours+Days ──
  async updateJobCore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const body = req.body || {};
      const data: Record<string, any> = {};
      if (body.hire_date !== undefined) data.hire_date = new Date(body.hire_date);
      if (body.job_code !== undefined) data.job_code = body.job_code;
      if (body.probation_end_date !== undefined) data.probation_end_date = new Date(body.probation_end_date);
      if (body.contract_end_date !== undefined) data.contract_end_date = new Date(body.contract_end_date);
      if (body.contracted_hours_per_week !== undefined) data.contracted_hours_per_week = Number(body.contracted_hours_per_week);
      if (body.contracted_days_per_week !== undefined) data.contracted_days_per_week = Number(body.contracted_days_per_week);

      const employee = await employeeService.updateJobCore(id as string, data);
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(200).json(successResponse('Job details updated', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to update job details', err.message));
    }
  }

  // ── POST /employees/:id/job/employment-status ─────────────────────────
  async addEmploymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { effective_date, employment_status, comment } = req.body;
      if (!effective_date || !employment_status) {
        res.status(400).json(errorResponse('effective_date and employment_status are required')); return;
      }

      const employee = await employeeService.addEmploymentStatusEntry(id as string, {
        effective_date: new Date(effective_date),
        employment_status,
        comment,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(201).json(successResponse('Employment status entry added', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to add employment status entry', err.message));
    }
  }

  // ── POST /employees/:id/job/compensation ──────────────────────────────
  async addCompensation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { effective_date, pay_schedule, pay_type, pay_rate_amount, pay_rate_currency, pay_rate_per, overtime, change_reason, comment } = req.body;
      if (!effective_date || !pay_schedule || !pay_type || pay_rate_amount === undefined || !pay_rate_per) {
        res.status(400).json(errorResponse('effective_date, pay_schedule, pay_type, pay_rate_amount and pay_rate_per are required')); return;
      }

      const employee = await employeeService.addCompensationEntry(id as string, {
        effective_date: new Date(effective_date),
        pay_schedule,
        pay_type,
        pay_rate_amount: Number(pay_rate_amount),
        pay_rate_currency,
        pay_rate_per,
        overtime,
        change_reason,
        comment,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(201).json(successResponse('Compensation entry added', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to add compensation entry', err.message));
    }
  }

  // ── POST /employees/:id/job/allowances ─────────────────────────────────
  async addAllowance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { effective_date } = req.body;
      if (!effective_date) { res.status(400).json(errorResponse('effective_date is required')); return; }

      const {
        phone, travel, housing, electricity, acting,
        additional_duties, shift_leader, call_out, other, currency,
      } = req.body;

      const employee = await employeeService.addAllowanceEntry(id as string, {
        effective_date: new Date(effective_date),
        phone: phone !== undefined ? Number(phone) : undefined,
        travel: travel !== undefined ? Number(travel) : undefined,
        housing: housing !== undefined ? Number(housing) : undefined,
        electricity: electricity !== undefined ? Number(electricity) : undefined,
        acting: acting !== undefined ? Number(acting) : undefined,
        additional_duties: additional_duties !== undefined ? Number(additional_duties) : undefined,
        shift_leader: shift_leader !== undefined ? Number(shift_leader) : undefined,
        call_out: call_out !== undefined ? Number(call_out) : undefined,
        other: other !== undefined ? Number(other) : undefined,
        currency,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(201).json(successResponse('Allowance entry added', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to add allowance entry', err.message));
    }
  }

  // ── POST /employees/:id/job/job-information ────────────────────────────
  async addJobInformation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { effective_date, job_title, reports_to, location, division, department, teams } = req.body;
      if (!effective_date || !job_title) {
        res.status(400).json(errorResponse('effective_date and job_title are required')); return;
      }
      if (reports_to && !isValidId(reports_to)) {
        res.status(400).json(errorResponse('Invalid Reports To employee ID')); return;
      }

      const employee = await employeeService.addJobInformationEntry(id as string, {
        effective_date: new Date(effective_date),
        job_title,
        reports_to,
        location,
        division,
        department,
        teams,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(201).json(successResponse('Job information entry added', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to add job information entry', err.message));
    }
  }

  // ── POST /employees/:id/job/airport-security-pass ──────────────────────
  async addAirportSecurityPass(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { issue_date, expiration_date, comments } = req.body;
      if (!issue_date || !expiration_date) {
        res.status(400).json(errorResponse('issue_date and expiration_date are required')); return;
      }

      const employee = await employeeService.addAirportSecurityPassEntry(id as string, {
        issue_date: new Date(issue_date),
        expiration_date: new Date(expiration_date),
        comments,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(201).json(successResponse('Airport security pass entry added', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to add airport security pass entry', err.message));
    }
  }

  // ── POST /employees/:id/job/bonus ───────────────────────────────────────
  async addBonus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { date, amount, reason, comment } = req.body;
      if (!date || amount === undefined) {
        res.status(400).json(errorResponse('date and amount are required')); return;
      }

      const employee = await employeeService.addBonusEntry(id as string, {
        date: new Date(date),
        amount: Number(amount),
        reason,
        comment,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(201).json(successResponse('Bonus entry added', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to add bonus entry', err.message));
    }
  }

  // ── POST /employees/:id/job/commission ──────────────────────────────────
  async addCommission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { date, amount, comment } = req.body;
      if (!date || amount === undefined) {
        res.status(400).json(errorResponse('date and amount are required')); return;
      }

      const employee = await employeeService.addCommissionEntry(id as string, {
        date: new Date(date),
        amount: Number(amount),
        comment,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(201).json(successResponse('Commission entry added', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to add commission entry', err.message));
    }
  }

  // ── POST /employees/:id/job/equity ──────────────────────────────────────
  async addEquity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const {
        grant_type, custom_grant_type_name, grant_date, vesting_start_date,
        equity_granted, strike_price, vesting_schedule, vesting_months, cliff_months,
      } = req.body;

      if (!grant_type || !grant_date || equity_granted === undefined) {
        res.status(400).json(errorResponse('grant_type, grant_date and equity_granted are required')); return;
      }

      const employee = await employeeService.addEquityEntry(id as string, {
        grant_type,
        custom_grant_type_name,
        grant_date: new Date(grant_date),
        vesting_start_date: vesting_start_date ? new Date(vesting_start_date) : undefined,
        equity_granted: Number(equity_granted),
        strike_price: strike_price !== undefined ? Number(strike_price) : undefined,
        vesting_schedule,
        vesting_months: vesting_months !== undefined ? Number(vesting_months) : undefined,
        cliff_months: cliff_months !== undefined ? Number(cliff_months) : undefined,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(201).json(successResponse('Equity entry added', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to add equity entry', err.message));
    }
  }

  // ── PUT /employees/:id/job/pay-rates ────────────────────────────────────
  async updatePayRates(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { daily, holiday, sick, vacation_pay_in_lieu_rate } = req.body;

      const employee = await employeeService.updatePayRates(id as string, {
        daily: daily !== undefined ? Number(daily) : undefined,
        holiday: holiday !== undefined ? Number(holiday) : undefined,
        sick: sick !== undefined ? Number(sick) : undefined,
        vacation_pay_in_lieu_rate: vacation_pay_in_lieu_rate !== undefined ? Number(vacation_pay_in_lieu_rate) : undefined,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(200).json(successResponse('Pay rates updated', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to update pay rates', err.message));
    }
  }

  // ── PUT /employees/:id/job/potential-bonus ──────────────────────────────
  async updatePotentialBonus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!isValidId(id)) { res.status(400).json(errorResponse('Invalid employee ID')); return; }

      const { annual_percentage, annual_amount, annual_amount_currency } = req.body;

      const employee = await employeeService.updatePotentialBonus(id as string, {
        annual_percentage: annual_percentage !== undefined ? Number(annual_percentage) : undefined,
        annual_amount: annual_amount !== undefined ? Number(annual_amount) : undefined,
        annual_amount_currency,
      });
      if (!employee) { res.status(404).json(errorResponse('Employee not found')); return; }

      res.status(200).json(successResponse('Potential bonus updated', employee));
    } catch (err: any) {
      res.status(500).json(errorResponse('Failed to update potential bonus', err.message));
    }
  }
}

export const employeeController = new EmployeeController();