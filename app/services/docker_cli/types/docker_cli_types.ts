export interface ClusterCertificateFiles {
  certPath: string
  keyPath: string
  caCertPath: string
  basePath: string
}

// Docker API response types
export interface StackInfo {
  Name: string
  Services: number
  Orchestrator: string
}

export interface ServiceInfo {
  ID: string
  Name: string
  Mode: string
  Replicas: string
  Image: string
  Ports: string
  Services: ServiceDetails[]
  ReplicasDesired: number
}

export interface ServiceDetails {
  ID: string
  Version: { Index: number }
  CreatedAt: string
  UpdatedAt: string
  Spec: {
    Name: string
    TaskTemplate: {
      ContainerSpec: {
        Image: string
        Args?: string[]
        Env?: string[]
      }
    }
    Mode?: {
      Replicated?: { Replicas: number }
      Global?: {}
    }
  }
  Endpoint?: {
    Ports?: Array<{
      Protocol: string
      TargetPort: number
      PublishedPort: number
      PublishMode?: string
    }>
  }
}

export interface ServiceTask {
  ID: string
  Name: string
  Image: string
  Node: string
  DesiredState: string
  CurrentState: string
  Error: string
  Ports: string
}

export interface SecretInfo {
  ID: string
  Name: string
  CreatedAt: string
  UpdatedAt: string
  Version: { Index: number }
}

export interface VolumeInfo {
  Name: string
  Driver: string
  Mountpoint: string
  Labels: Record<string, string>
  Scope: string
}

export interface NetworkInfo {
  ID: string
  Name: string
  Driver: string
  Scope: string
}

export interface ContainerInfo {
  ID: string
  Image: string
  Command: string
  CreatedAt: string
  RunningFor: string
  Ports: string
  Status: string
  Names: string
}

export interface ImageInfo {
  Repository: string
  Tag: string
  ImageID: string
  CreatedAt: string
  CreatedSince: string
  Size: string
}

export interface NodeInfo {
  ID: string
  Hostname: string
  Status: string
  Availability: string
  ManagerStatus?: string
  EngineVersion: string
}
