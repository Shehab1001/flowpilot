/**
 * Collection schemas shared by the worker and frontend.
 */
import type { CollectionSchema } from 'deepspace/schema'
import { usersSchema } from './schemas/users-schema'
import { settingsSchema } from './schemas/admin-schema'
import { workflowsSchema, workflowStepsSchema } from './schemas/flowpilot-schema'

export const schemas: CollectionSchema[] = [
  usersSchema,
  settingsSchema,
  workflowsSchema,
  workflowStepsSchema,
]
