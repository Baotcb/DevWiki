import { Controller, Get } from '@nestjs/common';
import {
    HealthCheckService,
    HealthCheck,
    MongooseHealthIndicator,
    MemoryHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private mongoose: MongooseHealthIndicator,
        private memory: MemoryHealthIndicator,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.mongoose.pingCheck('mongodb', { timeout: 3000 }),
            () => this.memory.checkHeap('memory_heap', 400 * 1024 * 1024),
        ]);
    }
}