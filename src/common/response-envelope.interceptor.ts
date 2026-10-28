import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';

export interface ResponseMetaData {
  Timestamp: string;
  Path: string;
  /** Only for list responses: how many items `Data` holds. */
  Count?: number;
}

export interface SuccessEnvelope {
  Success: true;
  StatusCode: number;
  Data: unknown;
  MetaData: ResponseMetaData;
}

/**
 * Every JSON answer has the same shape: `{ Success, StatusCode, Data, MetaData }`.
 * `Data` is whatever the controller returned: the response classes (for
 * example ArticleResponse) already use PascalCase keys such as `CompanyId`, so
 * nothing is renamed here. Requests keep sending camelCase keys. Errors use the
 * matching shape from AllExceptionsFilter. Files such as the newsletter CSV
 * (a plain string) are left as they are.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => {
        // Files (the newsletter CSV is a plain string) are not JSON: send them as they are.
        // Headers set with @Header() are only applied after interceptors, so look at the data itself.
        if (typeof data === 'string' || Buffer.isBuffer(data)) return data;

        const envelope: SuccessEnvelope = {
          Success: true,
          StatusCode: response.statusCode,
          Data: data ?? null,
          MetaData: {
            Timestamp: new Date().toISOString(),
            Path: request.originalUrl,
            ...(Array.isArray(data) ? { Count: data.length } : {}),
          },
        };
        return envelope;
      }),
    );
  }
}
