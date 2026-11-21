/**
 * FlowPilot data model.
 * Records are stored in DeepSpace's app-owned SQLite-backed RecordRoom.
 * These are workflow definitions only; execution is implemented separately.
 */
import type { CollectionSchema } from 'deepspace/schema'

const denied = { read: false, create: false, update: false, delete: false } as const

export const workflowsSchema: CollectionSchema = {
  name: 'workflows',
  ownerField: 'ownerId',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true, required: true },
    { name: 'name', storage: 'text', interpretation: 'plain', required: true },
    { name: 'description', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['draft', 'active', 'paused'] }, default: 'draft' },
    { name: 'nodeLayout', storage: 'text', interpretation: { kind: 'json' }, default: '{}' },
  ],
  permissions: {
    '*': denied,
    viewer: denied,
    member: { read: 'own', create: true, update: 'own', delete: 'own' },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

export const workflowStepsSchema: CollectionSchema = {
  name: 'workflow_steps',
  ownerField: 'ownerId',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true, required: true },
    { name: 'workflowId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'label', storage: 'text', interpretation: 'plain', required: true },
    { name: 'type', storage: 'text', interpretation: { kind: 'select', options: ['http_get', 'json_transform'] }, required: true },
    { name: 'position', storage: 'number', interpretation: 'plain', required: true },
    { name: 'config', storage: 'text', interpretation: { kind: 'json' }, required: true },
  ],
  permissions: {
    '*': denied,
    viewer: denied,
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}

/** Run history is append-only for members and only accessible via authenticated actions. */
export const workflowRunsSchema: CollectionSchema = {
  name: 'workflow_runs',
  ownerField: 'ownerId',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain', userBound: true, immutable: true, required: true },
    { name: 'workflowId', storage: 'text', interpretation: 'plain', required: true },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['success', 'failed'] }, required: true },
    { name: 'startedAt', storage: 'text', interpretation: 'plain', required: true },
    { name: 'durationMs', storage: 'number', interpretation: 'plain', required: true },
    { name: 'error', storage: 'text', interpretation: 'plain', default: '' },
    { name: 'stepsJson', storage: 'text', interpretation: { kind: 'json' }, required: true },
    { name: 'outputJson', storage: 'text', interpretation: 'plain', required: true },
  ],
  permissions: {
    '*': denied,
    viewer: denied,
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: true, create: true, update: true, delete: true },
  },
}
