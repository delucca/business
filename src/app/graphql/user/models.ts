import { Field, InputType, ObjectType, registerEnumType } from '@nestjs/graphql'

import { PolicyObject } from 'src/app/graphql/authz/models'
import { KeyResultCheckInObject } from 'src/app/graphql/key-result/check-in/models'
import { KeyResultObject } from 'src/app/graphql/key-result/models'
import { EntityObject } from 'src/app/graphql/models'
import { ObjectiveObject } from 'src/app/graphql/objective/models'
import { TeamObject } from 'src/app/graphql/team/models'
import { USER_GENDER } from 'src/domain/user/constants'

registerEnumType(USER_GENDER, {
  name: 'USER_GENDER',
  description: 'Each gender represents a possible gender option for our users',
})

@ObjectType('User', {
  implements: () => EntityObject,
  description:
    'User is an entity inside a given root team (a.k.a. company). It is associated with many teams, progress reports, and others.',
})
export class UserObject implements EntityObject {
  @Field({ description: 'The name of the user' })
  public firstName: string

  @Field({ description: 'The full name of the user' })
  public fullName: string

  @Field({ description: 'The sub field in Auth0 (their ID)' })
  public authzSub: string

  @Field({ description: 'The creation date of the user' })
  public createdAt: Date

  @Field({ description: 'The last update date of this user' })
  public updatedAt: Date

  @Field({ description: 'The last name of the user', nullable: true })
  public lastName?: string

  @Field({ description: 'The gender of the user', nullable: true })
  public gender?: USER_GENDER

  @Field({ description: 'The user role in the company', nullable: true })
  public role?: string

  @Field({ description: 'The picture of the user', nullable: true })
  public picture?: string

  @Field(() => String, {
    description: 'The custom nickname that user wants to be called',
    nullable: true,
  })
  public nickname?: string

  @Field(() => String, {
    description:
      'A description for that user. A more detailed information where the user tells about her/himself',
    nullable: true,
  })
  public about?: string

  @Field(() => String, {
    description: "The URL for the user's LinkedIn profile",
    nullable: true,
  })
  public linkedInProfileAddress?: string

  @Field(() => [TeamObject], {
    description: 'The creation date ordered list of companies that this user is a part of',
    nullable: true,
  })
  public companies?: TeamObject[]

  @Field(() => [TeamObject], {
    description: 'The creation date ordered list of teams that this user is part of',
    nullable: true,
  })
  public teams?: Promise<TeamObject[]>

  @Field(() => [TeamObject], {
    description: 'The creation date ordered list of teams that this user owns',
    nullable: true,
  })
  public ownedTeams?: TeamObject[]

  @Field(() => [ObjectiveObject], {
    description: 'The creation date ordered list of objectives that this user owns',
    nullable: true,
  })
  public objectives?: ObjectiveObject[]

  @Field(() => [KeyResultObject], {
    description: 'The creation date ordered list of key results that this user owns',
    nullable: true,
  })
  public keyResults?: KeyResultObject[]

  @Field(() => [KeyResultCheckInObject], {
    description: 'The creation date ordered list of key result check-ins created by this user',
    nullable: true,
  })
  public keyResultCheckIns?: KeyResultCheckInObject[]

  public id: string
  public policies: PolicyObject
}

@InputType({ description: 'Data that you can assign to a given user' })
export class UserDataInput {
  @Field(() => String, { description: 'The first name of the user', nullable: true })
  public firstName?: string

  @Field(() => String, { description: 'The last name of the user', nullable: true })
  public lastName?: string

  @Field(() => USER_GENDER, {
    description:
      'The gender of the user. The gender is used to define how we would call that given user',
    nullable: true,
  })
  public gender?: USER_GENDER

  @Field(() => String, { description: 'The role of the user in her/his company', nullable: true })
  public role?: string

  @Field(() => String, {
    description: 'The custom nickname that user wants to be called',
    nullable: true,
  })
  public nickname?: string

  @Field(() => String, {
    description:
      'A description for that user. A more detailed information where the user tells about her/himself',
    nullable: true,
  })
  public about?: string

  @Field(() => String, {
    description: "The URL for the user's LinkedIn profile",
    nullable: true,
  })
  public linkedInProfileAddress?: string
}
