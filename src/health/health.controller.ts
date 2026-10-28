import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators.js';

/** Answer of GET /health. */
export class HealthResponse {
  Status: 'ok';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API and database are up' })
  @ApiOkResponse({ type: HealthResponse })
  async check(): Promise<HealthResponse> {
    await this.dataSource.query('SELECT 1');
    return { Status: 'ok' };
  }
}
