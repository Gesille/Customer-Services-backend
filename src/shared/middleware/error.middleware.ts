import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../models/response.model';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[Error] ${err.message}`);
  res.status(500).json(errorResponse('Internal server error', err.message));
};

export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json(errorResponse(`Route ${req.originalUrl} not found`));
};