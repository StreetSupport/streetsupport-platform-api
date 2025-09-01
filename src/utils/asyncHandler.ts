import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'production') {
      const originalSend = res.json;
      res.json = function(body) {
        console.log('Response:', JSON.stringify(body, null, 2));
        return originalSend.call(this, body);
      };
    }
    
    Promise.resolve(fn(req, res, next))
      .catch((error) => {
        console.error('Async Handler Error:', error);
        next(error);
      });
  };
};
