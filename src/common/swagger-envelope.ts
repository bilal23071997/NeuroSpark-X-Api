import type { OpenAPIObject } from '@nestjs/swagger';

// Every answer is wrapped as `{ Success, StatusCode, Data, MetaData }` (errors:
// `{ Success, StatusCode, Error, ErrorMessage, Errors, MetaData }`). The
// controllers are documented with the schema of what they return (`Data`), so
// this puts that schema inside the wrapper in the generated OpenAPI document.
// The response classes already have PascalCase properties, so nothing is renamed.

type Json = Record<string, unknown>;

const SCHEMA_PREFIX = '#/components/schemas/';

export function wrapDocumentInEnvelope(document: OpenAPIObject) {
  const schemas = ((document.components ??= {}).schemas ??= {}) as Record<
    string,
    Json
  >;

  schemas.ResponseMetaData = {
    type: 'object',
    properties: {
      Timestamp: { type: 'string', format: 'date-time' },
      Path: { type: 'string', example: '/public/niches' },
      Count: {
        type: 'integer',
        description: 'Only for lists: how many items `Data` holds.',
      },
    },
    required: ['Timestamp', 'Path'],
  };
  schemas.ErrorResponse = {
    type: 'object',
    properties: {
      Success: { type: 'boolean', example: false },
      StatusCode: { type: 'integer', example: 400 },
      Error: { type: 'string', example: 'Bad Request' },
      ErrorMessage: {
        type: 'string',
        description: 'One sentence a person can read.',
      },
      Errors: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Every validation problem; only present when there is more than one.',
      },
      MetaData: { $ref: `${SCHEMA_PREFIX}ResponseMetaData` },
    },
    required: ['Success', 'StatusCode', 'Error', 'ErrorMessage', 'MetaData'],
  };

  const successSchema = (data: unknown, statusCode: number): Json => ({
    type: 'object',
    properties: {
      Success: { type: 'boolean', example: true },
      StatusCode: { type: 'integer', example: statusCode },
      Data: data ?? { nullable: true },
      MetaData: { $ref: `${SCHEMA_PREFIX}ResponseMetaData` },
    },
    required: ['Success', 'StatusCode', 'Data', 'MetaData'],
  });

  for (const path of Object.values(document.paths)) {
    for (const operation of Object.values(path as Record<string, unknown>)) {
      const responses = (
        operation as { responses?: Record<string, Json> } | null
      )?.responses;
      if (!responses) continue;
      for (const [code, response] of Object.entries(responses)) {
        const status = Number(code);
        const content = response.content as Record<string, Json> | undefined;
        if (status >= 400) {
          response.content = {
            'application/json': {
              schema: { $ref: `${SCHEMA_PREFIX}ErrorResponse` },
            },
          };
        } else if (status >= 200 && status < 300 && status !== 204) {
          if (content && !content['application/json']) continue; // a file download, sent as it is
          response.content = {
            'application/json': {
              schema: successSchema(
                content?.['application/json']?.schema,
                status,
              ),
            },
          };
        }
      }
    }
  }
}
