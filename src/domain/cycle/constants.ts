export enum CADENCE {
  YEARLY = 'YEARLY',
  QUARTERLY = 'QUARTERLY',
}

export const CADENCE_RANK = {
  [CADENCE.QUARTERLY]: 0,
  [CADENCE.YEARLY]: 1,
}

export const DEFAULT_PROGRESS = 0
export const DEFAULT_CONFIDENCE = 100
