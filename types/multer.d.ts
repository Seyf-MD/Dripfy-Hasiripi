declare module 'multer' {
  import type { RequestHandler } from 'express';

  interface MulterLimits {
    fileSize?: number;
    files?: number;
    fields?: number;
  }

  interface MulterOptions {
    storage?: any;
    limits?: MulterLimits;
    fileFilter?: (
      req: import('express').Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile?: boolean) => void
    ) => void;
  }

  interface MulterInstance {
    single(fieldName: string): RequestHandler;
    array(fieldName: string, maxCount?: number): RequestHandler;
    fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
  }

  namespace multer {
    function memoryStorage(): any;
    class MulterError extends Error {
      constructor(code: string, field?: string);
      code: string;
      field?: string;
    }
  }

  function multer(options?: MulterOptions): MulterInstance;

  export = multer;
}
