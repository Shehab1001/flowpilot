# FlowPilot — Data model (phase 1)

FlowPilot uses **DeepSpace RecordRoom collections** (SQLite-backed Durable Objects), not a separate local SQL database. The shared schema is registered in `src/schemas.ts` and is used by the existing worker and RecordScope. No new Worker routing or database service is required for CRUD.

## Collections

| Collection | Fields | Access |
| --- | --- | --- |
| `workflows` | `ownerId`, `name`, `description`, `status` | A member can create and manage only their own workflows. Admin can manage all. |
| `workflow_steps` | `ownerId`, `workflowId`, `label`, `type`, `position`, `config` | Members can only read their own steps; step writes are reserved for trusted server code until workflow-reference validation is implemented. |

The SDK supplies `recordId`, `createdBy`, `createdAt`, and `updatedAt` in the record envelope. `ownerId` is stamped from authenticated identity and immutable. Anonymous and viewer access is denied.

## Important security boundary

A step's `workflowId` is a string reference, **not** a SQLite foreign-key constraint. Allowing arbitrary direct client writes to steps would permit linking a user's step to someone else's workflow. The current schema intentionally disables member create/update/delete for `workflow_steps`. Later, a server action must verify that the referenced workflow belongs to the authenticated caller before creating or changing a step. It must also ensure configuration values are safe (e.g. HTTP request allowlists and SSRF prevention).

Likewise, an `active` status does not execute anything yet: execution engine and run history have not been implemented.

## Next implementation steps

1. Add server actions that validate step ownership, enforce per-workflow step limits and validate step configs.
2. Add a React workflow list/editor using `useQuery` and confirmed mutations.
3. Add server-only execution and `workflow_runs` / `step_runs` history with explicit user read permissions.
4. Implement bounded/safe HTTP GET and JSON transform; add tests and deploy.

## Verify

```bash
git switch dev
npm run type-check
npm run test:unit
```

No deployment or runtime integration test was performed by this change.

References:
- https://docs.deep.space/concepts/data-model
- https://docs.deep.space/sdk-reference/worker/schemas
- https://docs.deep.space/concepts/permissions
