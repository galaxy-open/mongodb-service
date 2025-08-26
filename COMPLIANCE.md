# SSPL Compliance Guide

This document provides guidance for compliance with the Server Side Public License v1 when offering this MongoDB hosting platform as a service.

## Service Source Code Requirements

Under Section 13 of the Server Side Public License v1, if you offer this MongoDB hosting platform as a service, you must make publicly available all Service Source Code. This includes:

### Core Application Components
- ✅ This application source code in its entirety
- ✅ All API endpoints and business logic implementations
- ✅ Database schemas, migrations, and data access layers
- ✅ Configuration files and environment setup procedures

### Infrastructure and Orchestration
- ✅ Docker containers and orchestration configurations
- ✅ Infrastructure as Code scripts (Terraform, etc.)
- ✅ Monitoring and logging system configurations
- ✅ Backup and restore automation scripts and procedures

### Service Platform Components
- ✅ OAuth 2.0 authorization server implementation
- ✅ Complete REST API implementation for service management
- ✅ Database provisioning and lifecycle management systems
- ✅ Billing integration and payment processing logic
- ✅ Background job processing systems
- ✅ Webhook delivery and event notification systems
- ✅ Administrative interfaces included within this platform

### Operational Systems
- ✅ Deployment scripts and continuous integration/deployment pipelines
- ✅ Monitoring dashboard configurations and alerting rules
- ✅ Service health checking and diagnostics systems
- ✅ Maintenance and support automation tools

## Components NOT Required for Compliance

### Client Applications and User Interfaces
The following components are **NOT required** to be made available under SSPL, as they are client applications that consume the service through its public APIs and OAuth 2.0 interface:

- ❌ **Web applications** that authenticate via OAuth 2.0 and consume public REST APIs
- ❌ **Mobile applications** that interact with the service through documented APIs
- ❌ **Third-party integrations** that utilize the OAuth 2.0 and REST API interfaces
- ❌ **Custom user interfaces** developed by service operators or their customers
- ❌ **Proprietary dashboard applications** that function as API clients

### Legal Basis for Exclusion
These client applications are excluded from SSPL requirements because:

1. **Service Independence**: The MongoDB hosting service operates fully without these applications
2. **API-Based Interaction**: All functionality is accessible through documented public REST APIs
3. **OAuth 2.0 Standard**: Authentication follows industry-standard OAuth 2.0 protocols
4. **Replicability**: Third parties can fully replicate the service using only the provided Service Source Code
5. **Client-Server Separation**: These applications function as clients consuming services, not as components of the service itself

## Service Replication Test

The Service Source Code provided satisfies SSPL requirements because any third party can:

1. Deploy the complete MongoDB hosting service using only the open source components
2. Authenticate users through the included OAuth 2.0 authorization server
3. Provision and manage MongoDB instances through the REST API endpoints
4. Process billing and subscriptions through the integrated systems
5. Monitor and maintain the service using the provided operational tools
6. Build their own client applications using the documented public APIs

No proprietary user interfaces or client applications are necessary to operate the service.

## Compliance Implementation

To ensure compliance when offering this platform as a service:

1. **Repository Management**: Maintain a public repository containing all Service Source Code
2. **Modification Disclosure**: Include any modifications or customizations in the public repository
3. **Documentation**: Provide clear deployment and operational documentation
4. **Dependency Tracking**: Document all software dependencies required for service operation
5. **API Documentation**: Maintain current documentation for all public REST API endpoints

## Legal Framework Reference

This compliance guide is based on the Server Side Public License v1, Section 13, which states:

*"If you make the functionality of the Program or a modified version available to third parties as a service, you must make the Service Source Code available via download (e.g. over a network) to everyone at no charge, under the terms of this License..."*

The complete SSPL v1 license text is available at:
https://www.mongodb.com/licensing/server-side-public-license

## Legal Disclaimer

This document provides general guidance based on our interpretation of the Server Side Public License v1. It does not constitute legal advice. Organizations should consult with qualified legal counsel for definitive guidance on license compliance requirements specific to their use case and jurisdiction.
