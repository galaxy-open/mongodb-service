import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import OrganizationProvisioningService from '#services/organization_provisioning_service'
import OrganizationRepository from '#repositories/organization_repository'
import RoleRepository from '#repositories/role_repository'
import UserRoles from '#enums/user_roles'
import UserFactory from '#database/factories/user_factory'
import RoleFactory from '#database/factories/role_factory'
import User from '#models/user'
import Organization from '#models/organization'
import Role from '#models/role'
import { JWTOrganizationData } from '#services/oauth_jwt_service'

test.group('OrganizationProvisioningService | Unit', (group) => {
  let service: OrganizationProvisioningService
  let organizationRepositoryStub: sinon.SinonStubbedInstance<OrganizationRepository>
  let roleRepositoryStub: sinon.SinonStubbedInstance<RoleRepository>
  let fakeUser: User

  const organizationData: JWTOrganizationData = {
    username: 'test-org',
  }

  let mockOwnerRole: Role
  let mockDeveloperRole: Role

  const mockOrganization = {
    id: 'org-123',
    username: 'test-org',
    billingEmail: 'test@example.com',
    ownerUserId: 'user-123',
  } as Organization

  group.each.setup(async () => {
    organizationRepositoryStub = sinon.createStubInstance(OrganizationRepository)
    roleRepositoryStub = sinon.createStubInstance(RoleRepository)

    app.container.swap(OrganizationRepository, () => organizationRepositoryStub as any)
    app.container.swap(RoleRepository, () => roleRepositoryStub as any)

    fakeUser = await UserFactory.merge({ id: 'user-123', email: 'test@example.com' }).make()
    mockOwnerRole = await RoleFactory.merge({ name: UserRoles.OWNER }).make()
    mockDeveloperRole = await RoleFactory.merge({ name: UserRoles.DEVELOPER }).make()

    service = new OrganizationProvisioningService(organizationRepositoryStub, roleRepositoryStub)
  })

  group.each.teardown(() => {
    app.container.restore(OrganizationRepository)
    app.container.restore(RoleRepository)
    sinon.restore()
  })

  test('provisionOrganizationAndUser :: should create new organization with user as owner when organization does not exist', async ({
    assert,
  }) => {
    // Setup: Organization does not exist
    organizationRepositoryStub.findByUsername.resolves(null)
    organizationRepositoryStub.create.resolves(mockOrganization)
    roleRepositoryStub.findByName.resolves(mockOwnerRole)
    organizationRepositoryStub.assignUserToOrganization.resolves()

    const result = await service.provisionOrganizationAndUser(fakeUser, organizationData)

    // Verify organization creation
    assert.isTrue(organizationRepositoryStub.findByUsername.calledOnceWith('test-org'))
    assert.isTrue(organizationRepositoryStub.create.calledOnce)

    const createArgs = organizationRepositoryStub.create.firstCall.args[0]
    assert.equal(createArgs.username, 'test-org')
    assert.equal(createArgs.billingEmail, 'test@example.com')
    assert.equal(createArgs.ownerUserId, 'user-123')

    // Verify role assignment
    assert.isTrue(roleRepositoryStub.findByName.calledOnceWith(UserRoles.OWNER))
    assert.isTrue(
      organizationRepositoryStub.assignUserToOrganization.calledOnceWith(
        'user-123',
        'org-123',
        mockOwnerRole.name
      )
    )

    // Verify result
    assert.equal(result.organization, mockOrganization)
    assert.equal(result.userRole, UserRoles.OWNER)
    assert.isTrue(result.isNewOrganization)
    assert.isTrue(result.isNewMembership)
  })

  test('provisionOrganizationAndUser :: should add user as developer to existing organization when user is not member', async ({
    assert,
  }) => {
    // Setup: Organization exists, user is not a member
    organizationRepositoryStub.findByUsername.resolves(mockOrganization)
    organizationRepositoryStub.findUserMembership.resolves(null)
    roleRepositoryStub.findByName.resolves(mockDeveloperRole)
    organizationRepositoryStub.assignUserToOrganization.resolves()

    const result = await service.provisionOrganizationAndUser(fakeUser, organizationData)

    // Verify membership check
    assert.isTrue(organizationRepositoryStub.findByUsername.calledOnceWith('test-org'))
    assert.isTrue(
      organizationRepositoryStub.findUserMembership.calledOnceWith('user-123', 'org-123')
    )

    // Verify user assignment as developer
    assert.isTrue(roleRepositoryStub.findByName.calledOnceWith(UserRoles.DEVELOPER))
    assert.isTrue(
      organizationRepositoryStub.assignUserToOrganization.calledOnceWith(
        'user-123',
        'org-123',
        mockDeveloperRole.name
      )
    )

    // Verify organization was NOT created
    assert.isFalse(organizationRepositoryStub.create.called)

    // Verify result
    assert.equal(result.organization, mockOrganization)
    assert.equal(result.userRole, UserRoles.DEVELOPER)
    assert.isFalse(result.isNewOrganization)
    assert.isTrue(result.isNewMembership)
  })

  test('provisionOrganizationAndUser :: should return existing membership when user is already member', async ({
    assert,
  }) => {
    const existingMembership = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      $extras: {
        pivot_role_name: mockDeveloperRole.name,
      },
    } as any

    // Setup: Organization exists, user is already a member
    organizationRepositoryStub.findByUsername.resolves(mockOrganization)
    organizationRepositoryStub.findUserMembership.resolves(existingMembership)
    roleRepositoryStub.findById.resolves(mockDeveloperRole)

    const result = await service.provisionOrganizationAndUser(fakeUser, organizationData)

    // Verify membership check
    assert.isTrue(organizationRepositoryStub.findByUsername.calledOnceWith('test-org'))
    assert.isTrue(
      organizationRepositoryStub.findUserMembership.calledOnceWith('user-123', 'org-123')
    )

    // Verify role lookup
    assert.isTrue(roleRepositoryStub.findById.calledOnceWith(mockDeveloperRole.name))

    // Verify no new assignments
    assert.isFalse(organizationRepositoryStub.create.called)
    assert.isFalse(organizationRepositoryStub.assignUserToOrganization.called)
    assert.isFalse(roleRepositoryStub.findByName.called)

    // Verify result
    assert.equal(result.organization, mockOrganization)
    assert.equal(result.userRole, UserRoles.DEVELOPER)
    assert.isFalse(result.isNewOrganization)
    assert.isFalse(result.isNewMembership)
  })

  test('provisionOrganizationAndUser :: should throw error when role is not found during organization creation', async ({
    assert,
  }) => {
    // Setup: Organization does not exist, but role lookup fails
    organizationRepositoryStub.findByUsername.resolves(null)
    organizationRepositoryStub.create.resolves(mockOrganization)
    roleRepositoryStub.findByName.resolves(null) // Role not found

    try {
      await service.provisionOrganizationAndUser(fakeUser, organizationData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, `Role ${UserRoles.OWNER} not found`)
    }

    // Verify organization was created but role assignment failed
    assert.isTrue(organizationRepositoryStub.create.calledOnce)
    assert.isTrue(roleRepositoryStub.findByName.calledOnceWith(UserRoles.OWNER))
    assert.isFalse(organizationRepositoryStub.assignUserToOrganization.called)
  })

  test('provisionOrganizationAndUser :: should throw error when role is not found during user assignment', async ({
    assert,
  }) => {
    // Setup: Organization exists, user is not member, but role lookup fails
    organizationRepositoryStub.findByUsername.resolves(mockOrganization)
    organizationRepositoryStub.findUserMembership.resolves(null)
    roleRepositoryStub.findByName.resolves(null) // Role not found

    try {
      await service.provisionOrganizationAndUser(fakeUser, organizationData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, `Role ${UserRoles.DEVELOPER} not found`)
    }

    // Verify membership check was done but assignment failed
    assert.isTrue(organizationRepositoryStub.findUserMembership.calledOnce)
    assert.isTrue(roleRepositoryStub.findByName.calledOnceWith(UserRoles.DEVELOPER))
    assert.isFalse(organizationRepositoryStub.assignUserToOrganization.called)
  })

  test('provisionOrganizationAndUser :: should handle repository errors during organization creation', async ({
    assert,
  }) => {
    const repositoryError = new Error('Database connection failed')

    organizationRepositoryStub.findByUsername.resolves(null)
    organizationRepositoryStub.create.rejects(repositoryError)

    try {
      await service.provisionOrganizationAndUser(fakeUser, organizationData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database connection failed')
    }

    assert.isTrue(organizationRepositoryStub.findByUsername.calledOnce)
    assert.isTrue(organizationRepositoryStub.create.calledOnce)
  })

  test('provisionOrganizationAndUser :: should handle repository errors during user assignment', async ({
    assert,
  }) => {
    const assignmentError = new Error('Assignment failed')

    organizationRepositoryStub.findByUsername.resolves(null)
    organizationRepositoryStub.create.resolves(mockOrganization)
    roleRepositoryStub.findByName.resolves(mockOwnerRole)
    organizationRepositoryStub.assignUserToOrganization.rejects(assignmentError)

    try {
      await service.provisionOrganizationAndUser(fakeUser, organizationData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Assignment failed')
    }

    assert.isTrue(organizationRepositoryStub.create.calledOnce)
    assert.isTrue(organizationRepositoryStub.assignUserToOrganization.calledOnce)
  })

  test('provisionOrganizationAndUser :: should handle case-insensitive organization lookup', async ({
    assert,
  }) => {
    const upperCaseOrgData: JWTOrganizationData = {
      username: 'TEST-ORG',
    }

    organizationRepositoryStub.findByUsername.resolves(null)
    organizationRepositoryStub.create.resolves(mockOrganization)
    roleRepositoryStub.findByName.resolves(mockOwnerRole)
    organizationRepositoryStub.assignUserToOrganization.resolves()

    await service.provisionOrganizationAndUser(fakeUser, upperCaseOrgData)

    // Should call with uppercase as provided (repository handles case-insensitivity)
    assert.isTrue(organizationRepositoryStub.findByUsername.calledOnceWith('TEST-ORG'))

    // Organization should be created with the provided username
    const createArgs = organizationRepositoryStub.create.firstCall.args[0]
    assert.equal(createArgs.username, 'TEST-ORG')
  })

  test('isValidOrganizationData :: should return true for valid organization data', async ({
    assert,
  }) => {
    const validData: JWTOrganizationData = {
      username: 'valid-org',
    }

    const result = service.isValidOrganizationData(validData)

    assert.isTrue(result)
  })

  test('isValidOrganizationData :: should return false for undefined organization data', async ({
    assert,
  }) => {
    const result = service.isValidOrganizationData(undefined)

    assert.isFalse(result)
  })

  test('isValidOrganizationData :: should return false for organization data with empty username', async ({
    assert,
  }) => {
    const invalidData: JWTOrganizationData = {
      username: '',
    }

    const result = service.isValidOrganizationData(invalidData)

    assert.isFalse(result)
  })

  test('isValidOrganizationData :: should return false for organization data with whitespace-only username', async ({
    assert,
  }) => {
    const invalidData: JWTOrganizationData = {
      username: '   ',
    }

    const result = service.isValidOrganizationData(invalidData)

    assert.isFalse(result)
  })

  test('isValidOrganizationData :: should return false for organization data missing username', async ({
    assert,
  }) => {
    const invalidData = {} as JWTOrganizationData

    const result = service.isValidOrganizationData(invalidData)

    assert.isFalse(result)
  })

  test('provisionOrganizationAndUser :: should handle existing organization with different case', async ({
    assert,
  }) => {
    const lowerCaseOrgData: JWTOrganizationData = {
      username: 'test-org',
    }

    // Organization exists (repository should handle case-insensitive lookup)
    organizationRepositoryStub.findByUsername.resolves(mockOrganization)
    organizationRepositoryStub.findUserMembership.resolves(null)
    roleRepositoryStub.findByName.resolves(mockDeveloperRole)
    organizationRepositoryStub.assignUserToOrganization.resolves()

    const result = await service.provisionOrganizationAndUser(fakeUser, lowerCaseOrgData)

    // Should find existing organization
    assert.isTrue(organizationRepositoryStub.findByUsername.calledOnceWith('test-org'))
    assert.isFalse(result.isNewOrganization)
    assert.isTrue(result.isNewMembership)
  })

  test('provisionOrganizationAndUser :: should handle role lookup failure for existing membership', async ({
    assert,
  }) => {
    const existingMembership = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      $extras: {
        pivot_role_name: 'invalid-role-id',
      },
    } as any

    organizationRepositoryStub.findByUsername.resolves(mockOrganization)
    organizationRepositoryStub.findUserMembership.resolves(existingMembership)
    roleRepositoryStub.findById.resolves(null) // Role not found

    try {
      await service.provisionOrganizationAndUser(fakeUser, organizationData)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      // Should get an error when trying to access role.name on null
      assert.include(error.message.toLowerCase(), 'cannot read')
    }

    assert.isTrue(roleRepositoryStub.findById.calledOnceWith('invalid-role-id' as UserRoles))
  })
})
