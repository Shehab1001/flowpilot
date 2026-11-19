import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { workflowActions } from './workflows'

export const actions: Record<string, ActionHandler<Env>> = {
  ...workflowActions,
}
