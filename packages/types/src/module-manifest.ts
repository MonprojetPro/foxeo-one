export type ModuleTarget = 'hub' | 'client-lab' | 'client-one'

export type ModuleRoute = {
  path: string
  component: string
}

export type ModuleNavigation = {
  icon: string
  label: string
  position: number
}

export type ModuleDocumentation = {
  hasGuide: boolean
  hasFaq: boolean
  hasFlows: boolean
}

export type ModuleManifest = {
  id: string
  name: string
  version: string
  description: string
  navigation: ModuleNavigation
  routes: ModuleRoute[]
  apiRoutes?: Array<{
    path: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  }>
  requiredTables: string[]
  targets: ModuleTarget[]
  dependencies: string[]
  documentation: ModuleDocumentation
}
