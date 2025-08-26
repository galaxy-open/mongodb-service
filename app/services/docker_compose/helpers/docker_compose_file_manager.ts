import { inject } from '@adonisjs/core'
import drive from '@adonisjs/drive/services/main'
import app from '@adonisjs/core/services/app'
import { DockerComposeFileParams } from '#services/docker_compose/types/docker_compose_types'

@inject()
export default class DockerComposeFileManager {
  async saveToFile(
    content: string,
    params: DockerComposeFileParams,
    fileType: 'database' | 'exporter' = 'database'
  ): Promise<{
    fileName: string
    filePath: string
  }> {
    const prefix =
      fileType === 'exporter' ? `${params.databaseType}-exporter` : `${params.databaseType}`

    const fileName = `docker-compose/${prefix}-${params.deploymentType}-${Date.now()}.yml`
    const disk = drive.use('fs')
    await disk.put(fileName, content)

    return { fileName, filePath: app.tmpPath(fileName) }
  }
}
