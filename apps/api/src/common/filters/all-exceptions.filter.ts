import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCode } from '../constants';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request as any).requestId ||
      uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      let defaultCode = ErrorCode.INTERNAL_SERVER_ERROR;
      if (status === 404) defaultCode = ErrorCode.RESOURCE_NOT_FOUND;
      else if (status === 403) defaultCode = ErrorCode.FORBIDDEN;
      else if (status === 401) defaultCode = ErrorCode.UNAUTHORIZED;
      else if (status === 422) defaultCode = ErrorCode.BUSINESS_RULE_VIOLATION;
      else if (status === 400) defaultCode = ErrorCode.VALIDATION_ERROR;

      if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        code = resObj.code || defaultCode;
        message = Array.isArray(resObj.message)
          ? resObj.message.join('; ')
          : resObj.message || exception.message;
        details =
          resObj.details || (Array.isArray(resObj.message) ? resObj.message : undefined);
      } else {
        code = defaultCode;
        message = String(res);
      }
    } else if (exception && typeof exception === 'object') {
      const err = exception as any;
      // MongoDB duplicate key error (E11000)
      if (err.code === 11000) {
        status = HttpStatus.CONFLICT;
        code = ErrorCode.BUSINESS_RULE_VIOLATION;
        const duplicateField = Object.keys(err.keyPattern || {})[0] || 'field';
        message = `Duplicate key violation on ${duplicateField}. Resource with this unique constraint already exists.`;
        if (duplicateField.toLowerCase().includes('idempotency')) {
          code = ErrorCode.IDEMPOTENCY_CONFLICT;
        }
      } else if (err.name === 'ValidationError') {
        // Mongoose validation error
        status = HttpStatus.BAD_REQUEST;
        code = ErrorCode.VALIDATION_ERROR;
        message = err.message;
        details = err.errors;
      } else if (err.name === 'CastError') {
        // Mongoose invalid ObjectId / CastError
        status = HttpStatus.NOT_FOUND;
        code = ErrorCode.RESOURCE_NOT_FOUND;
        message = `Không tìm thấy tài nguyên với định danh '${err.value}'`;
      } else {
        this.logger.error(
          `Unhandled Exception [${requestId}]: ${err.message || 'Unknown error'}`,
          err.stack,
        );
      }
    }

    // Set requestId header on response
    response.setHeader('x-request-id', requestId);

    response.status(status).json({
      error: {
        code,
        message,
        details,
        requestId,
      },
    });
  }
}
