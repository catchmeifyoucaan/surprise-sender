import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export interface ValidatedRequest<T = any> extends Request {
  validatedBody?: T;
  validatedQuery?: T;
  validatedParams?: T;
}

export const validateRequest = <T>(
  schema: z.ZodSchema<T>,
  target: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validatedData = schema.parse(data);
      
      switch (target) {
        case 'body':
          req.validatedBody = validatedData;
          break;
        case 'query':
          req.validatedQuery = validatedData;
          break;
        case 'params':
          req.validatedParams = validatedData;
          break;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

export const validateOptional = <T>(
  schema: z.ZodSchema<T>,
  target: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      
      // If no data, continue without validation
      if (!data || Object.keys(data).length === 0) {
        return next();
      }
      
      const validatedData = schema.parse(data);
      
      switch (target) {
        case 'body':
          req.validatedBody = validatedData;
          break;
        case 'query':
          req.validatedQuery = validatedData;
          break;
        case 'params':
          req.validatedParams = validatedData;
          break;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Helper function to create consistent API responses
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
) => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString()
});

// Helper function to handle async route errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json(createApiResponse(false, undefined, 'Validation error', error.message));
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json(createApiResponse(false, undefined, 'Unauthorized', error.message));
  }
  
  if (error.name === 'ForbiddenError') {
    return res.status(403).json(createApiResponse(false, undefined, 'Forbidden', error.message));
  }
  
  if (error.name === 'NotFoundError') {
    return res.status(404).json(createApiResponse(false, undefined, 'Not found', error.message));
  }
  
  // Default error response
  const statusCode = (error as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;
  
  res.status(statusCode).json(createApiResponse(false, undefined, 'Server error', message));
};