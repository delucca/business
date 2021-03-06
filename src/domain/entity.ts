import { Logger } from '@nestjs/common'
import { startOfWeek } from 'date-fns'
import { flow, mapKeys, snakeCase } from 'lodash'
import {
  Brackets,
  CreateDateColumn,
  DeleteResult,
  FindConditions,
  PrimaryGeneratedColumn,
  Repository,
  SelectQueryBuilder,
  WhereExpression,
} from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'

import { CONSTRAINT, CONSTRAINT_ORDER, DOMAIN_SORTING, MUTATION_QUERY_TYPE } from './constants'
import { TeamDTO } from './team/dto'
import { UserDTO } from './user/dto'

export interface DomainEntityServiceInterface<E, D> {
  buildContext: (user: UserDTO, constraint: CONSTRAINT) => DomainServiceContext
  createWithConstraint: (data: Partial<D>, queryContext: DomainQueryContext) => Promise<E[]>
  getOneWithConstraint: (
    selector: FindConditions<E>,
    queryContext: DomainQueryContext,
  ) => Promise<E | null>
  getManyWithConstraint: (
    selector: FindConditions<E>,
    queryContext: DomainQueryContext,
  ) => Promise<E[] | null>
  getOne: (
    selector: FindConditions<E>,
    queryContext?: DomainQueryContext,
    options?: DomainServiceGetOptions<E>,
  ) => Promise<E | null>
  getMany: (
    selector: FindConditions<E>,
    queryContext?: DomainQueryContext,
    options?: DomainServiceGetOptions<E>,
  ) => Promise<E[] | null>
  updateWithConstraint: (
    selector: FindConditions<E>,
    newData: QueryDeepPartialEntity<E>,
    queryContext: DomainQueryContext,
  ) => Promise<E | E[] | null>
  deleteWithConstraint: (
    selector: FindConditions<E>,
    queryContext: DomainQueryContext,
  ) => Promise<DeleteResult>
  defineResourceHighestConstraint: (
    entity: E,
    queryContext: DomainQueryContext,
    currentConstraint?: CONSTRAINT,
  ) => Promise<CONSTRAINT>
}

export interface DomainServiceGetOptions<E> {
  limit?: number
  offset?: number
  orderBy?: Partial<Record<keyof E, DOMAIN_SORTING>>
}

export interface DomainServiceContext {
  constraint: CONSTRAINT
  user: UserDTO
}

export interface QueryContext {
  companies: TeamDTO[]
  teams: TeamDTO[]
  userTeams: TeamDTO[]
}

export interface DomainQueryContext extends DomainServiceContext {
  query: QueryContext
}

export type DomainCreationQuery<E> = () => Promise<E[] | null>

export abstract class DomainEntityService<E extends DomainEntity, D>
  implements DomainEntityServiceInterface<E, D> {
  protected readonly logger: Logger

  constructor(
    protected readonly loggerName: string,
    protected readonly repository: DomainEntityRepository<E>,
  ) {
    this.logger = new Logger(loggerName ?? DomainEntityService.name)
  }

  public buildContext(user: UserDTO, constraint: CONSTRAINT) {
    const context: DomainServiceContext = {
      user,
      constraint,
    }

    return context
  }

  public async createWithConstraint(data: Partial<D>, queryContext: DomainQueryContext) {
    const shouldConstrainCreation = queryContext.constraint !== CONSTRAINT.ANY

    return shouldConstrainCreation
      ? this.createIfWithinConstraint(data, queryContext)
      : this.create(data, queryContext)
  }

  public async getOneWithConstraint(selector: FindConditions<E>, queryContext: DomainQueryContext) {
    const query = await this.getWithConstraint(selector, queryContext)
    const data = this.getOneInQuery(query, queryContext)

    return data
  }

  public async getManyWithConstraint(
    selector: FindConditions<E>,
    queryContext: DomainQueryContext,
  ) {
    const query = await this.getWithConstraint(selector, queryContext)
    const data = this.getManyInQuery(query, queryContext)

    return data
  }

  public async updateWithConstraint(
    selector: FindConditions<E>,
    newData: QueryDeepPartialEntity<E>,
    queryContext: DomainQueryContext,
  ) {
    const shouldConstrainCreation = queryContext.constraint !== CONSTRAINT.ANY

    return shouldConstrainCreation
      ? this.updateIfWithinConstraint(selector, newData, queryContext)
      : this.update(selector, newData, queryContext)
  }

  public async deleteWithConstraint(selector: FindConditions<E>, queryContext: DomainQueryContext) {
    const shouldConstrainDeletion = queryContext.constraint !== CONSTRAINT.ANY

    return shouldConstrainDeletion
      ? this.deleteIfWithinConstraint(selector, queryContext)
      : this.delete(selector, queryContext)
  }

  public async getOne(
    selector: FindConditions<E>,
    queryContext?: DomainQueryContext,
    options?: DomainServiceGetOptions<E>,
  ) {
    const query = this.get(selector, queryContext, undefined, options)

    return query.getOne()
  }

  public async getMany(
    selector: FindConditions<E>,
    queryContext?: DomainQueryContext,
    options?: DomainServiceGetOptions<E>,
  ) {
    const query = this.get(selector, queryContext, undefined, options)

    return query.getMany()
  }

  public async defineResourceHighestConstraint(
    entity: E,
    originalQueryContext: DomainQueryContext,
    currentConstraint: CONSTRAINT = CONSTRAINT.ANY,
  ) {
    const currentConstraintIndex = CONSTRAINT_ORDER.indexOf(currentConstraint)
    const nextConstraintIndex = currentConstraintIndex + 1
    const isLastIndex = nextConstraintIndex + 1 === CONSTRAINT_ORDER.length

    const selector = { id: entity.id } as any
    const nextConstraint = CONSTRAINT_ORDER[nextConstraintIndex]
    const queryContext = this.changeConstraintInQueryContext(originalQueryContext, nextConstraint)

    const foundData = await this.getOneWithConstraint(selector, queryContext)
    if (!foundData) return currentConstraint

    return isLastIndex
      ? nextConstraint
      : this.defineResourceHighestConstraint(entity, queryContext, nextConstraint)
  }

  protected async create(data: Partial<D> | Array<Partial<D>>, _queryContext?: DomainQueryContext) {
    const result = await this.repository.insert(data as QueryDeepPartialEntity<E>)
    const createdIDs = result.identifiers.map((data) => data.id)

    const createdData = await this.repository.findByIds(createdIDs)

    return createdData
  }

  protected async createIfWithinConstraint(data: Partial<D>, queryContext: DomainQueryContext) {
    const creationQuery = async () => this.create(data, queryContext)

    return this.protectCreationQuery(creationQuery, data, queryContext)
  }

  protected async getWithConstraint(selector: FindConditions<E>, queryContext: DomainQueryContext) {
    const availableSelectors = {
      [CONSTRAINT.ANY]: async () => this.get(selector, queryContext),
      [CONSTRAINT.COMPANY]: async () => this.getIfUserIsInCompany(selector, queryContext),
      [CONSTRAINT.TEAM]: async () => this.getIfUserIsInTeam(selector, queryContext),
      [CONSTRAINT.OWNS]: async () => this.getIfUserOwnsIt(selector, queryContext),
    }
    const constrainedSelector = availableSelectors[queryContext.constraint]
    if (!constrainedSelector) return

    return constrainedSelector()
  }

  protected get(
    selector: FindConditions<E>,
    _queryContext: DomainQueryContext,
    constrainQuery?: SelectionQueryConstrain<E>,
    options?: DomainServiceGetOptions<E>,
  ) {
    const orderBy = mapKeys(options?.orderBy, (_, key) => snakeCase(key))

    const query = this.repository
      .createQueryBuilder()
      .where(selector)
      .take(options?.limit ?? 0)
      .orderBy(orderBy)

    return constrainQuery ? constrainQuery(query) : query
  }

  protected async getIfUserIsInCompany(
    selector: FindConditions<E>,
    queryContext: DomainQueryContext,
  ) {
    const { query, user } = queryContext
    const constrainQuery = this.repository.constraintQueryToTeam(query.teams, user)

    return this.get(selector, queryContext, constrainQuery)
  }

  protected async getIfUserIsInTeam(selector: FindConditions<E>, queryContext: DomainQueryContext) {
    const { query, user } = queryContext
    const constrainQuery = this.repository.constraintQueryToTeam(query.userTeams, user)

    return this.get(selector, queryContext, constrainQuery)
  }

  protected async getIfUserOwnsIt(selector: FindConditions<E>, queryContext: DomainQueryContext) {
    const { user } = queryContext
    const constrainQuery = this.repository.constraintQueryToOwns(user)

    return this.get(selector, queryContext, constrainQuery)
  }

  protected async getOneInQuery(query: SelectQueryBuilder<E>, queryContext?: DomainQueryContext) {
    this.logger.debug({
      queryContext,
      message: `Getting one for request`,
    })

    return query.getOne()
  }

  protected async getManyInQuery(query: SelectQueryBuilder<E>, queryContext?: DomainQueryContext) {
    this.logger.debug({
      queryContext,
      message: `Getting many for request`,
    })

    return query.getMany()
  }

  protected async update(
    selector: FindConditions<E>,
    newData: QueryDeepPartialEntity<E>,
    queryContext?: DomainQueryContext,
  ) {
    await this.repository.update(selector, newData)

    return this.getOne(selector, queryContext)
  }

  protected async updateIfWithinConstraint(
    selector: FindConditions<E>,
    newData: QueryDeepPartialEntity<E>,
    queryContext: DomainQueryContext,
  ) {
    const updateQuery = async () => this.update(selector, newData, queryContext)

    return this.protectMutationQuery<E>(
      updateQuery,
      selector,
      queryContext,
      MUTATION_QUERY_TYPE.UPDATE,
    )
  }

  protected async delete(selector: FindConditions<E>, _queryContext: DomainQueryContext) {
    return this.repository.delete(selector)
  }

  protected async deleteIfWithinConstraint(
    selector: FindConditions<E>,
    queryContext: DomainQueryContext,
  ) {
    const deleteQuery = async () => this.delete(selector, queryContext)

    return this.protectMutationQuery<DeleteResult>(
      deleteQuery,
      selector,
      queryContext,
      MUTATION_QUERY_TYPE.DELETE,
    )
  }

  protected async protectMutationQuery<T>(
    query: () => Promise<T>,
    selector: FindConditions<E>,
    queryContext: DomainQueryContext,
    queryType: MUTATION_QUERY_TYPE,
  ) {
    const availableSetups = {
      [MUTATION_QUERY_TYPE.UPDATE]: async (
        query: SelectQueryBuilder<E>,
        queryContext: DomainQueryContext,
      ) => this.setupUpdateMutationQuery(query, queryContext),
      [MUTATION_QUERY_TYPE.DELETE]: async (
        query: SelectQueryBuilder<E>,
        queryContext: DomainQueryContext,
      ) => this.setupDeleteMutationQuery(query, queryContext),
    }
    const setup = availableSetups[queryType]

    const validationQuery = await this.getWithConstraint(selector, queryContext)
    const validationQueryAfterSetup = await setup(validationQuery, queryContext)
    const validationData = await validationQueryAfterSetup.getOne()
    if (!validationData) return

    return query()
  }

  protected async setupUpdateMutationQuery(
    query: SelectQueryBuilder<E>,
    _queryContext: DomainQueryContext,
  ) {
    return query
  }

  protected async setupDeleteMutationQuery(
    query: SelectQueryBuilder<E>,
    _queryContext: DomainQueryContext,
  ) {
    return query
  }

  protected changeConstraintInQueryContext(
    originalQueryContext: DomainQueryContext,
    constraint: CONSTRAINT,
  ) {
    return {
      ...originalQueryContext,
      constraint,
    }
  }

  protected getFirstDayAfterLastWeek() {
    const date = new Date()
    const firstDayAfterLastWeek = startOfWeek(date, {
      weekStartsOn: 6,
    })

    return firstDayAfterLastWeek
  }

  protected abstract protectCreationQuery(
    query: DomainCreationQuery<E>,
    data: Partial<D>,
    queryContext: DomainQueryContext,
  ): Promise<E[] | null>
}

export type SelectionQueryConstrain<E> = (query?: SelectQueryBuilder<E>) => SelectQueryBuilder<E>

export interface DomainEntityRepositoryInterface<E> {
  constraintQueryToTeam: (allowedTeams: TeamDTO[], user: UserDTO) => SelectionQueryConstrain<E>
  constraintQueryToOwns: (user: UserDTO) => (query: SelectQueryBuilder<E>) => SelectQueryBuilder<E>
}

export enum CONSTRAINT_TYPE {
  AND = 'and',
  OR = 'or',
}

export enum CONDITIONAL_METHOD_NAMES {
  AND_WHERE = 'andWhere',
  OR_WHERE = 'orWhere',
}

export abstract class DomainEntityRepository<E>
  extends Repository<E>
  implements DomainEntityRepositoryInterface<E> {
  protected composeTeamQuery = flow(this.setupOwnsQuery, this.setupTeamQuery)

  public constraintQueryToTeam(allowedTeams: TeamDTO[], user: UserDTO) {
    const addConstraintToQuery = (query?: SelectQueryBuilder<E>) => {
      const baseQuery = query ?? this.createQueryBuilder()
      const composedQuery = this.composeTeamQuery(baseQuery)
      const allowedTeamIDs = allowedTeams.map((team) => team.id)

      return composedQuery.andWhere(
        new Brackets((query) => {
          const teamOwnedEntities = this.addTeamWhereExpression(query, allowedTeamIDs)
          const userAndTeamOwnedEntities = this.addOwnsWhereExpression(teamOwnedEntities, user)

          return userAndTeamOwnedEntities
        }),
      )
    }

    return addConstraintToQuery
  }

  public constraintQueryToOwns(user: UserDTO) {
    const addConstraintToQuery = (query?: SelectQueryBuilder<E>) => {
      const baseQuery = query ?? this.createQueryBuilder()

      return baseQuery.andWhere(
        new Brackets((query) => {
          const userOwnedEntities = this.addOwnsWhereExpression(query, user)

          return userOwnedEntities
        }),
      )
    }

    return addConstraintToQuery
  }

  protected setupTeamQuery(query: SelectQueryBuilder<E>) {
    return query
  }

  protected setupOwnsQuery(query: SelectQueryBuilder<E>) {
    return query
  }

  protected selectConditionMethodNameBasedOnConstraintType(constraintType: CONSTRAINT_TYPE) {
    const methodNames = {
      [CONSTRAINT_TYPE.AND]: CONDITIONAL_METHOD_NAMES.AND_WHERE,
      [CONSTRAINT_TYPE.OR]: CONDITIONAL_METHOD_NAMES.OR_WHERE,
    }
    const constraintTypeMethodName = methodNames[constraintType]

    return constraintTypeMethodName
  }

  protected abstract addTeamWhereExpression(
    query: WhereExpression,
    allowedTeams: Array<TeamDTO['id']>,
    constraintType?: CONSTRAINT_TYPE,
  ): WhereExpression

  protected abstract addOwnsWhereExpression(
    query: WhereExpression,
    user: UserDTO,
    constraintType?: CONSTRAINT_TYPE,
  ): WhereExpression
}

export interface DomainEntitySpecificationInterface<T> {
  currentRevision?: (candidate: T) => boolean

  isSatisfiedBy(candidate: T): boolean
  and(other: DomainEntitySpecificationInterface<T>): DomainEntitySpecificationInterface<T>
  not(): DomainEntitySpecificationInterface<T>
}

export abstract class DomainEntitySpecification<T>
  implements DomainEntitySpecificationInterface<T> {
  public and(other: DomainEntitySpecificationInterface<T>) {
    return new AndSpecification(this, other)
  }

  public not() {
    return new NotSpecification(this)
  }

  public abstract isSatisfiedBy(candidate: T): boolean
}

class AndSpecification<T> extends DomainEntitySpecification<T> {
  private readonly one: DomainEntitySpecificationInterface<T>
  private readonly other: DomainEntitySpecificationInterface<T>

  public constructor(
    one: DomainEntitySpecificationInterface<T>,
    other: DomainEntitySpecificationInterface<T>,
  ) {
    super()
    this.one = one
    this.other = other
  }

  public isSatisfiedBy(candidate: T) {
    return this.one.isSatisfiedBy(candidate) && this.other.isSatisfiedBy(candidate)
  }
}

class NotSpecification<T> extends DomainEntitySpecification<T> {
  private readonly wrapped: DomainEntitySpecificationInterface<T>

  public constructor(wrapped: DomainEntitySpecificationInterface<T>) {
    super()
    this.wrapped = wrapped
  }

  public isSatisfiedBy(candidate: T) {
    return !this.wrapped.isSatisfiedBy(candidate)
  }
}

export abstract class DomainEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @CreateDateColumn()
  public createdAt: Date
}
