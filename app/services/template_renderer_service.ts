import { inject } from '@adonisjs/core'
import { Edge } from 'edge.js'
import app from '@adonisjs/core/services/app'
import { join } from 'node:path'

@inject()
export default class TemplateRendererService {
  constructor(protected edge: Edge) {}

  /**
   * Renders a template using the Edge.js template engine
   */
  async renderTemplate(templateName: string, data: any): Promise<string> {
    await this.mountDefaultNamespace()

    return this.edge.render(templateName, data)
  }

  private async mountDefaultNamespace() {
    // Ensure the default namespace is mounted for jobs context
    // Use the standard resources/views path relative to app root
    const viewsPath = join(app.appRoot.pathname, 'resources', 'views')
    this.edge.mount('default', viewsPath)
  }
}
