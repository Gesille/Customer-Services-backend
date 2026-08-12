import { Router } from 'express';

import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { readLimiter } from '../middleware';
import { employeeController } from '../controllers/Employee.controller';

export const employeeRouter = Router();

// ── Read (admin dashboard) ──────────────────────────────────────────────
employeeRouter.get(
  '/',
  readLimiter, isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.getAll(req, res),
);

// ⚠️ All literal (non-`:id`) GET routes MUST be declared here, before
// GET '/:id' below. Express matches routes top-to-bottom, and ':id'
// matches ANY single path segment — including "analytics", "probation",
// etc. If a literal route is declared after '/:id', it will never be
// reached; the request gets swallowed by getById() first.
employeeRouter.get(
  '/analytics',
  readLimiter, isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.getAnalytics(req, res),
);
employeeRouter.get(
  '/probation/pending',
  readLimiter, isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.getPendingProbationReviews(req, res),
);
employeeRouter.get(
  '/contracts/near-end',
  readLimiter, isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.getContractsNearingEnd(req, res),
);

// ── Single-employee lookup — must come AFTER every literal GET route above ──
employeeRouter.get(
  '/:id',
  readLimiter, isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.getById(req, res),
);

// ── Create / Delete ──────────────────────────────────────────────────────
employeeRouter.post(
  '/',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.create(req, res),
);
employeeRouter.delete(
  '/:id',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.delete(req, res),
);

// ── Job tab — core fields (Hire Date / Job Code / Probation / Contract / Contracted Hours+Days) ──
employeeRouter.put(
  '/:id/job/core',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.updateJobCore(req, res),
);

// ── Job tab — effective-dated history tables ("Add Entry" buttons) ──────
employeeRouter.post(
  '/:id/job/employment-status',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.addEmploymentStatus(req, res),
);
employeeRouter.post(
  '/:id/job/compensation',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.addCompensation(req, res),
);
employeeRouter.post(
  '/:id/job/allowances',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.addAllowance(req, res),
);
employeeRouter.post(
  '/:id/job/job-information',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.addJobInformation(req, res),
);
employeeRouter.post(
  '/:id/job/airport-security-pass',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.addAirportSecurityPass(req, res),
);
employeeRouter.post(
  '/:id/job/bonus',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.addBonus(req, res),
);
employeeRouter.post(
  '/:id/job/commission',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.addCommission(req, res),
);
employeeRouter.post(
  '/:id/job/equity',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.addEquity(req, res),
);

// ── Job tab — single-value panels (Pay Rates / Potential Bonus) ─────────
employeeRouter.put(
  '/:id/job/pay-rates',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.updatePayRates(req, res),
);
employeeRouter.put(
  '/:id/job/potential-bonus',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.updatePotentialBonus(req, res),
);

// ── Update basic info (Personal / Address / Contact / Access) ────────────
employeeRouter.put(
  '/:id',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.updateBasicInfo(req, res),
);

// alongside the other POST /:id/job/* routes
employeeRouter.post(
  '/:id/job/probation-review',
  isAuthenticated, authorizeRoles('admin'),
  (req, res) => employeeController.resolveProbation(req, res),
);

export default employeeRouter;