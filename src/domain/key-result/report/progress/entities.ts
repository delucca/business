import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
} from 'typeorm'

import { KeyResultDTO } from 'domain/key-result/dto'
import { UserDTO } from 'domain/user/dto'

import { ProgressReportDTO } from './dto'

@Entity()
@Unique(['valuePrevious', 'valueNew', 'keyResultId'])
export class ProgressReport implements ProgressReportDTO {
  @PrimaryGeneratedColumn()
  public id: number

  @Column({ type: 'real', nullable: true })
  public valuePrevious?: number

  @Column('real')
  public valueNew: number

  @Column({ type: 'text', nullable: true })
  public comment?: string

  @CreateDateColumn()
  public createdAt: Date

  @ManyToOne('KeyResult', 'progressReports')
  public keyResult: KeyResultDTO

  @Column()
  @RelationId((progressReport: ProgressReport) => progressReport.keyResult)
  public keyResultId: KeyResultDTO['id']

  @ManyToOne('User', 'progressReports')
  public user: UserDTO

  @Column()
  @RelationId((progressReport: ProgressReport) => progressReport.user)
  public userId: UserDTO['id']
}