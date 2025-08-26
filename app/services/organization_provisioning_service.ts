import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import OrganizationRepository from '#repositories/organization_repository'
import RoleRepository from '#repositories/role_repository'
import UserRoles from '#enums/user_roles'
import type User from '#models/user'
import type { JWTOrganizationData } from '#services/oauth_jwt_service'

export interface OrganizationProvisioningResult {
  organization: Organization
  userRole: UserRoles
  isNewOrganization: boolean
  isNewMembership: boolean
}

@inject()
export default class OrganizationProvisioningService {
  constructor(
    private organizationRepository: OrganizationRepository,
    private roleRepository: RoleRepository
  ) {}

  /**
   * Provisions an organization and assigns a user with appropriate role.
   * Creates organization if it doesn't exist (first user becomes owner).
   * Assigns user as member if organization exists and user isn't already a member.
   */
  async provisionOrganizationAndUser(
    user: User,
    organizationData: JWTOrganizationData
  ): Promise<OrganizationProvisioningResult> {
    return await db.transaction(async (trx) => {
      // Find existing organization by username
      let organization = await this.organizationRepository.findByUsername(
        organizationData.username,
        trx
      )

      if (!organization) {
        // Create new organization with user as owner
        return await this.createOrganizationWithOwner(user, organizationData, trx)
      }
      // Add user to existing organization if not already member
      return await this.addUserToExistingOrganization(user, organization, trx)
    })
  }

  /**
   * Creates a new organization with user as owner
   */
  private async createOrganizationWithOwner(
    user: User,
    organizationData: JWTOrganizationData,
    trx: any
  ): Promise<OrganizationProvisioningResult> {
    const organization = await this.organizationRepository.create(
      {
        username: organizationData.username,
        billingEmail: user.email,
        ownerUserId: user.id,
      },
      trx
    )

    // Assign user as owner
    await this.assignUserRole(user.id, organization.id, UserRoles.OWNER, trx)

    logger.info(
      `JIT Organization created: ${organization.username} (${organization.id}) with owner ${user.email}`
    )

    return {
      organization,
      userRole: UserRoles.OWNER,
      isNewOrganization: true,
      isNewMembership: true,
    }
  }

  /**
   * Adds user to existing organization if not already a member
   */
  private async addUserToExistingOrganization(
    user: User,
    organization: Organization,
    trx: any
  ): Promise<OrganizationProvisioningResult> {
    // Check if user is already a member
    const existingMembership = await this.organizationRepository.findUserMembership(
      user.id,
      organization.id,
      trx
    )

    if (existingMembership) {
      // User is already a member - get their role
      const role = await this.roleRepository.findById(existingMembership.$extras.pivot_role_name)

      return {
        organization,
        userRole: role!.name,
        isNewOrganization: false,
        isNewMembership: false,
      }
    }

    // Add user as developer
    await this.assignUserRole(user.id, organization.id, UserRoles.DEVELOPER, trx)

    logger.info(
      `User ${user.email} added to organization ${organization.username} as ${UserRoles.DEVELOPER}`
    )

    return {
      organization,
      userRole: UserRoles.DEVELOPER,
      isNewOrganization: false,
      isNewMembership: true,
    }
  }

  /**
   * Assigns user to organization with specified role
   */
  private async assignUserRole(
    userId: string,
    organizationId: string,
    roleName: UserRoles,
    trx: any
  ): Promise<void> {
    const role = await this.roleRepository.findByName(roleName)
    if (!role) {
      throw new Error(`Role ${roleName} not found`)
    }

    await this.organizationRepository.assignUserToOrganization(
      userId,
      organizationId,
      role.name,
      trx
    )
  }

  /**
   * Checks if organization data is valid for provisioning
   */
  isValidOrganizationData(organizationData: JWTOrganizationData | undefined): boolean {
    return !!(
      organizationData &&
      organizationData.username &&
      organizationData.username.trim().length > 0
    )
  }
}
