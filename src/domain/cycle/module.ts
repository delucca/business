import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import databaseConfig from 'src/config/database/config'
import DomainObjectiveModule from 'src/domain/objective'
import DomainTeamModule from 'src/domain/team'

import DomainCycleRepository from './repository'
import DomainCycleService from './service'

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([DomainCycleRepository]),
    DomainTeamModule,
    DomainObjectiveModule,
  ],
  providers: [DomainCycleService],
  exports: [DomainCycleService],
})
class DomainCycleModule {}

export default DomainCycleModule
