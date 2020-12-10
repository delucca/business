import { Injectable } from '@nestjs/common'

import { RESOURCE } from 'app/authz/constants'
import GraphQLEntityService from 'app/graphql/service'
import { KeyResultDTO } from 'domain/key-result/dto'
import { KeyResult } from 'domain/key-result/entities'
import DomainKeyResultService from 'domain/key-result/service'

@Injectable()
class GraphQLKeyResultService extends GraphQLEntityService<KeyResult, KeyResultDTO> {
  constructor(public readonly keyResultDomain: DomainKeyResultService) {
    super(RESOURCE.KEY_RESULT, keyResultDomain)
  }
}

export default GraphQLKeyResultService