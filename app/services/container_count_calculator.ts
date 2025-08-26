import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'

export class ContainerCountCalculator {
  static calculate(engine: DatabaseEngines, deploymentType: DeploymentTypes): number {
    if (deploymentType === DeploymentTypes.STANDALONE) {
      return 1
    }

    switch (engine) {
      case DatabaseEngines.MONGODB:
        return 3
      default:
        return 1
    }
  }
}
