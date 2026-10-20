import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants';

export class BusinessRuleViolationException extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        code: ErrorCode.BUSINESS_RULE_VIOLATION,
        message,
        details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class OptimisticLockException extends HttpException {
  constructor(message = 'Resource was modified concurrently. Please refresh and try again.') {
    super(
      {
        code: ErrorCode.OPTIMISTIC_LOCK_CONFLICT,
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class IdempotencyConflictException extends HttpException {
  constructor(message = 'A request with this Idempotency-Key is already in progress or completed.') {
    super(
      {
        code: ErrorCode.IDEMPOTENCY_CONFLICT,
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource = 'Resource') {
    super(
      {
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: `${resource} not found`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
