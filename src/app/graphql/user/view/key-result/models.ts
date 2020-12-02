import { Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql'

import { KeyResultObject } from 'app/graphql/key-result/models'
import { UserObject } from 'app/graphql/user/models'
import { KeyResultViewBinding } from 'domain/user/view/key-result/types'

registerEnumType(KeyResultViewBinding, {
  name: 'KeyResultViewBinding',
  description: 'Each binding represents a given view in our applications',
})

@ObjectType('KeyResultView', {
  description:
    'A view created by an user that represents a custom key result ranking for a given binding',
})
export class KeyResultViewObject {
  @Field(() => ID, { description: 'The ID of the key result view' })
  id: number

  @Field({ nullable: true, description: 'The title(name) of the key result view' })
  title?: string

  @Field({
    nullable: true,
    description: 'An anchor between this view and a fixed tab in our applications',
  })
  binding?: KeyResultViewBinding

  @Field(() => [ID], { description: 'Ordered list of key result IDs' })
  rank: Array<KeyResultObject['id']>

  @Field(() => [KeyResultObject], {
    description: 'The rank ordered list of key results in that view',
  })
  keyResults: KeyResultObject[]

  @Field({ description: 'The creation date of this view' })
  createdAt: Date

  @Field({ description: 'The last update date of this view' })
  updatedAt: Date

  @Field(() => ID, { description: 'The ID of the uswer that owns this view' })
  userId: UserObject['id']

  @Field(() => UserObject, { description: 'The user that owns this view' })
  user: UserObject
}

@InputType({ description: 'Required data to create a new key result view' })
export class KeyResultViewInput {
  @Field({ nullable: true, description: 'The title(name) of the key result view' })
  title?: string

  @Field({
    nullable: true,
    description: 'An anchor between this view and a fixed tab in our applications',
  })
  binding?: KeyResultViewBinding

  @Field(() => [ID], { description: 'Ordered list of key result IDs' })
  rank: Array<KeyResultObject['id']>
}

@InputType({ description: 'Required data to update a given key result view rank' })
export class KeyResultViewRankInput {
  @Field(() => [ID], { description: 'Ordered list of key result IDs' })
  rank: Array<KeyResultObject['id']>
}