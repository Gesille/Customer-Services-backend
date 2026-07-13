import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';

export const jobRouter = Router();


jobRouter.get('/get-all-jobs', (req, res) => jobController.getAll(req, res));
jobRouter.get('/get-job/:id', (req, res) => jobController.getById(req, res));
jobRouter.get('/job-filter-restaurant/:restaurantId', (req, res) => jobController.getByRestaurant(req, res));


jobRouter.post('/create-job', isAuthenticated, authorizeRoles('admin'), (req, res) => jobController.create(req, res));
jobRouter.put('/update-job/:id', isAuthenticated, authorizeRoles('admin'), (req, res) => jobController.update(req, res));
jobRouter.delete('/delete-job/:id', isAuthenticated, authorizeRoles('admin'), (req, res) => jobController.delete(req, res));

export default jobRouter;