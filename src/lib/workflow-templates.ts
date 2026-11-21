/**
 * Built-in demos use the same exact allowlisted HTTPS endpoints as the
 * execution engine. Values are owned by the server, never taken from a
 * caller-supplied template definition.
 */
export const WORKFLOW_TEMPLATES = [
  {
    id: 'github-profile',
    name: 'GitHub profile lookup',
    description: 'Fetch a public GitHub profile and extract its login.',
    category: 'API basics',
    steps: [
      { label: 'Fetch GitHub profile', type: 'http_get', config: { url: 'https://api.github.com/users/octocat' } },
      { label: 'Extract login', type: 'json_transform', config: { field: 'login' } },
    ],
  },
  {
    id: 'github-followers',
    name: 'GitHub follower count',
    description: 'Query the GitHub API and extract a public follower count.',
    category: 'Data extraction',
    steps: [
      { label: 'Get public profile', type: 'http_get', config: { url: 'https://api.github.com/users/octocat' } },
      { label: 'Extract followers', type: 'json_transform', config: { field: 'followers' } },
    ],
  },
  {
    id: 'todo-title',
    name: 'Todo title extractor',
    description: 'Fetch sample JSON and extract the title field.',
    category: 'JSON transformation',
    steps: [
      { label: 'Fetch sample todo', type: 'http_get', config: { url: 'https://jsonplaceholder.typicode.com/todos/1' } },
      { label: 'Extract title', type: 'json_transform', config: { field: 'title' } },
    ],
  },
] as const

export type WorkflowTemplateId = typeof WORKFLOW_TEMPLATES[number]['id']

export function findWorkflowTemplate(id: unknown) {
  return typeof id === 'string' ? WORKFLOW_TEMPLATES.find(item => item.id === id) : undefined
}
