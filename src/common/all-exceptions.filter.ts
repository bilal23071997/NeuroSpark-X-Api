import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ResponseMetaData } from './response-envelope.interceptor.js';

export interface ErrorEnvelope {
  Success: false;
  StatusCode: number;
  /** The short name of the problem, e.g. "Bad Request" or "Conflict". */
  Error: string;
  /** One sentence a person can read. For several validation problems it is the first one. */
  ErrorMessage: string;
  /** Every problem when there is more than one (form validation); left out otherwise. */
  Errors?: string[];
  MetaData: ResponseMetaData;
}

/** Turns every failure into the common error shape; unexpected ones are logged and answered generically. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let messages: string[] = [
      'Something went wrong on our side. Please try again later.',
    ];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      error = HttpStatus[statusCode]
        ? statusName(statusCode)
        : exception.name.replace(/Exception$/, '');
      const body = exception.getResponse();
      if (typeof body === 'string') {
        messages = [body];
      } else if (body && typeof body === 'object') {
        const { message, error: name } = body as {
          message?: string | string[];
          error?: string;
        };
        if (name) error = name;
        if (Array.isArray(message)) messages = message.map(String);
        else if (message) messages = [message];
        else messages = [exception.message];
      }
    } else {
      this.logger.error(
        `${request.method} ${request.originalUrl}: ${exception instanceof Error ? (exception.stack ?? exception.message) : String(exception)}`,
      );
    }

    const envelope: ErrorEnvelope = {
      Success: false,
      StatusCode: statusCode,
      Error: error,
      ErrorMessage: messages[0],
      ...(messages.length > 1 ? { Errors: messages } : {}),
      MetaData: {
        Timestamp: new Date().toISOString(),
        Path: request.originalUrl,
      },
    };
    response.status(statusCode).json(envelope);
  }
}

/** HttpStatus.BAD_REQUEST -> "Bad Request". */
function statusName(statusCode: number) {
  return String(HttpStatus[statusCode])
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
