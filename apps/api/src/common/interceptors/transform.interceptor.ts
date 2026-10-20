import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        // If response already follows { data, meta } format
        if (
          res &&
          typeof res === 'object' &&
          'data' in res &&
          ('meta' in res || Object.keys(res).length === 1)
        ) {
          return res;
        }

        // Check if response has data and meta fields separated
        if (res && typeof res === 'object' && 'items' in res && 'meta' in res) {
          return {
            data: res.items,
            meta: res.meta,
          };
        }

        return {
          data: res ?? null,
        };
      }),
    );
  }
}
