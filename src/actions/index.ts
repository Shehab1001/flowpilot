import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { workflowActions } from './workflows'
import { executionActions } from './execution'

export const actions: Record<string, ActionHandler<Env>> = {
  ...workflowActions,
  ...executionActions,
}
