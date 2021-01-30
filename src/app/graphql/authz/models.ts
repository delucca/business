import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'

import { POLICY } from 'src/app/authz/constants'

@ObjectType('Policies', {
  description:
    'Defines the current available resource policies. You can use it to build read/create/update/delete logic on your application',
})
export class PolicyObject {
  @Field(() => POLICY, { defaultValue: POLICY.DENY })
  public create: POLICY

  @Field(() => POLICY, { defaultValue: POLICY.DENY })
  public read: POLICY

  @Field(() => POLICY, { defaultValue: POLICY.DENY })
  public update: POLICY

  @Field(() => POLICY, { defaultValue: POLICY.DENY })
  public delete: POLICY
}

registerEnumType(POLICY, {
  name: 'POLICY',
  description:
    'Defines if the current user has the permission for a given action regarding the resource',
})