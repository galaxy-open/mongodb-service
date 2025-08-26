import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import DatabaseInstanceService, {
  CreateDatabaseInstanceData,
} from '#services/database_instance/database_instance_service'
import DatabaseInstanceManager from '#services/database_instance/managers/database_instance_manager'
import DatabaseJobDispatcher from '#services/database_instance/dispatchers/database_job_dispatcher'
import StackNameGenerator from '#services/database_instance/helpers/stack_name_generator'
import InstanceSizeService from '#services/instance_size_service'
import InstanceStatus from '#enums/instance_status'
import DatabaseEngines from '#enums/database_engines'
import DeploymentTypes from '#enums/deployment_types'
import TLSModes from '#enums/tls_modes'
import RegionCodes from '#enums/region_codes'
import DatabaseVersions from '#enums/database_versions'
import DatabaseInstanceNames from '#enums/database_instance_names'
import { IhttpOwner } from '#interfaces/http_owner'

// Helper function to create valid test data
const createValidTestData = (
  overrides: Partial<CreateDatabaseInstanceData> = {}
): CreateDatabaseInstanceData => ({
  name: 'Test Database',
  databaseEngine: DatabaseEngines.MONGODB,
  deploymentType: DeploymentTypes.STANDALONE,
  tlsMode: TLSModes.ON,
  regionCode: RegionCodes.US_EAST_1,
  databaseVersion: DatabaseVersions.MONGODB_7_0_4,
  instanceSize: DatabaseInstanceNames.STANDARD,
  ...overrides,
})

test.group('DatabaseInstanceService | Unit', (group) => {
  let service: DatabaseInstanceService
  let managerStub: sinon.SinonStubbedInstance<DatabaseInstanceManager>
  let dispatcherStub: sinon.SinonStubbedInstance<DatabaseJobDispatcher>
  let stackNameGeneratorStub: sinon.SinonStubbedInstance<StackNameGenerator>
  let instanceSizeServiceStub: sinon.SinonStubbedInstance<InstanceSizeService>

  const mockOwner: IhttpOwner = {
    scopes: ['database:read', 'database:write'],
    id: 'user-123',
    username: 'testuser',
    userId: 'user-id-123',
  }

  const mockOrganizationOwner: IhttpOwner = {
    scopes: ['database:read', 'database:write'],
    id: 'org-123',
    username: 'testuser',
    userId: 'user-id-123',
  }

  const mockDatabase = {
    id: 'db-123',
    name: 'test-database',
    status: InstanceStatus.PROVISIONING,
    stackName: 'a1b2c3d4e5f6', // Mock 12-character random stackName
    ownerId: 'user-123',
  }

  group.each.setup(async () => {
    managerStub = sinon.createStubInstance(DatabaseInstanceManager)
    dispatcherStub = sinon.createStubInstance(DatabaseJobDispatcher)
    stackNameGeneratorStub = sinon.createStubInstance(StackNameGenerator)
    instanceSizeServiceStub = sinon.createStubInstance(InstanceSizeService)

    stackNameGeneratorStub.generateUniqueStackName.resolves('a1b2c3d4e5f6')
    instanceSizeServiceStub.findByNameAndDatabaseEngineAndDeploymentType.resolves({
      id: 'size-123',
    } as any)

    app.container.swap(DatabaseInstanceManager, () => managerStub as any)
    app.container.swap(DatabaseJobDispatcher, () => dispatcherStub as any)
    app.container.swap(StackNameGenerator, () => stackNameGeneratorStub as any)
    app.container.swap(InstanceSizeService, () => instanceSizeServiceStub as any)
    service = await app.container.make(DatabaseInstanceService)
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(DatabaseInstanceManager)
    app.container.restore(DatabaseJobDispatcher)
    app.container.restore(StackNameGenerator)
    app.container.restore(InstanceSizeService)
  })

  test('createInContext :: should create database with generated stackName', async ({ assert }) => {
    const data = createValidTestData()
    managerStub.createInContext.resolves(mockDatabase as any)

    const result = await service.createInContext(data, mockOwner)

    assert.isTrue(stackNameGeneratorStub.generateUniqueStackName.calledOnce)
    const { instanceSize, ...expectedData } = data
    assert.isTrue(
      managerStub.createInContext.calledOnceWith(
        sinon.match({
          ...expectedData,
          instanceSizeId: 'size-123',
          stackName: 'a1b2c3d4e5f6',
        }),
        mockOwner.id,
        mockOwner.userId
      )
    )
    assert.isTrue(dispatcherStub.dispatchCreate.calledOnceWith(mockDatabase, mockOwner.userId))
    assert.deepEqual(result, mockDatabase)
  })

  test('createInContext :: should generate stackName regardless of database name', async ({
    assert,
  }) => {
    const data = createValidTestData({ name: 'My Test Database' })
    managerStub.createInContext.resolves(mockDatabase as any)

    await service.createInContext(data, mockOwner)

    assert.isTrue(stackNameGeneratorStub.generateUniqueStackName.calledOnce)
    assert.isTrue(
      managerStub.createInContext.calledOnceWith(
        sinon.match({
          stackName: 'a1b2c3d4e5f6',
        }),
        sinon.match.any,
        sinon.match.any
      )
    )
    assert.isTrue(dispatcherStub.dispatchCreate.calledOnceWith(mockDatabase, mockOwner.userId))
  })

  test('createInContext :: should work with organization context', async ({ assert }) => {
    const data = createValidTestData({ name: 'Org Database' })
    managerStub.createInContext.resolves(mockDatabase as any)

    await service.createInContext(data, mockOrganizationOwner)

    assert.isTrue(stackNameGeneratorStub.generateUniqueStackName.calledOnce)
    assert.isTrue(
      managerStub.createInContext.calledOnceWith(
        sinon.match({
          stackName: 'a1b2c3d4e5f6',
        }),
        mockOrganizationOwner.id,
        mockOrganizationOwner.userId
      )
    )
    assert.isTrue(
      dispatcherStub.dispatchCreate.calledOnceWith(mockDatabase, mockOrganizationOwner.userId)
    )
  })

  test('listInContext :: should delegate to manager', async ({ assert }) => {
    const databases = [mockDatabase]
    managerStub.listInContext.resolves(databases as any)

    const result = await service.listInContext(mockOwner.id)

    assert.isTrue(managerStub.listInContext.calledOnceWith(mockOwner.id))
    assert.deepEqual(result, databases)
  })

  test('findByIdInContext :: should delegate to manager', async ({ assert }) => {
    managerStub.findByIdInContext.resolves(mockDatabase as any)

    const result = await service.findByIdInContext({ id: 'db-123', ownerId: mockOwner.id })

    assert.isTrue(
      managerStub.findByIdInContext.calledOnceWith({ id: 'db-123', ownerId: mockOwner.id })
    )
    assert.deepEqual(result, mockDatabase)
  })

  test('findByIdInContext :: should return null when database not found', async ({ assert }) => {
    managerStub.findByIdInContext.resolves(null as any)

    const result = await service.findByIdInContext({ id: 'nonexistent', ownerId: mockOwner.id })

    assert.isTrue(
      managerStub.findByIdInContext.calledOnceWith({ id: 'nonexistent', ownerId: mockOwner.id })
    )
    assert.isNull(result)
  })

  test('findWithFullDetailsInContext :: should delegate to manager', async ({ assert }) => {
    const databaseWithDetails = { ...mockDatabase, connections: [], deployments: [] }
    managerStub.findWithFullDetailsInContext.resolves(databaseWithDetails as any)

    const result = await service.findWithFullDetailsInContext({
      id: 'db-123',
      ownerId: mockOwner.id,
    })

    assert.deepEqual(result, databaseWithDetails)
  })

  test('updateInContext :: should update database and dispatch job', async ({ assert }) => {
    const updateData = { name: 'Updated Database' }
    const updatedDatabase = { ...mockDatabase, name: 'Updated Database' }
    managerStub.updateInContext.resolves(updatedDatabase as any)

    const result = await service.updateInContext(
      { id: 'db-123', ownerId: mockOwner.id },
      updateData
    )

    assert.isTrue(
      managerStub.updateInContext.calledOnceWith(
        { id: 'db-123', ownerId: mockOwner.id },
        updateData
      )
    )
    assert.isTrue(dispatcherStub.dispatchUpdate.calledOnceWith(updatedDatabase))
    assert.deepEqual(result, updatedDatabase)
  })

  test('updateInContext :: should return null when database not found', async ({ assert }) => {
    const updateData = { name: 'Updated Database' }
    managerStub.updateInContext.resolves(null)

    const result = await service.updateInContext(
      { id: 'nonexistent', ownerId: mockOwner.id },
      updateData
    )

    assert.isTrue(
      managerStub.updateInContext.calledOnceWith(
        { id: 'nonexistent', ownerId: mockOwner.id },
        updateData
      )
    )
    assert.isFalse(dispatcherStub.dispatchUpdate.called)
    assert.isNull(result)
  })

  test('deleteInContext :: should mark as deleting and dispatch job', async ({ assert }) => {
    const updatedDatabase = { ...mockDatabase, status: InstanceStatus.DELETING }
    managerStub.markAsDeleting.resolves(updatedDatabase as any)

    const result = await service.deleteInContext({ id: 'db-123', ownerId: mockOwner.id })

    assert.isTrue(
      managerStub.markAsDeleting.calledOnceWith({ id: 'db-123', ownerId: mockOwner.id })
    )
    assert.isTrue(dispatcherStub.dispatchDelete.calledOnceWith(updatedDatabase))
    assert.isTrue(result)
  })

  test('deleteInContext :: should return false when database not found', async ({ assert }) => {
    managerStub.markAsDeleting.resolves(null)

    const result = await service.deleteInContext({ id: 'nonexistent', ownerId: mockOwner.id })

    assert.isTrue(
      managerStub.markAsDeleting.calledOnceWith({ id: 'nonexistent', ownerId: mockOwner.id })
    )
    assert.isFalse(dispatcherStub.dispatchDelete.called)
    assert.isFalse(result)
  })

  test('createInContext :: should handle manager errors', async ({ assert }) => {
    const data = createValidTestData()
    const managerError = new Error('Manager create failed')
    managerStub.createInContext.rejects(managerError)

    try {
      await service.createInContext(data, mockOwner)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Manager create failed')
    }
  })

  test('listInContext :: should handle manager errors', async ({ assert }) => {
    const managerError = new Error('Manager list failed')
    managerStub.listInContext.rejects(managerError)

    try {
      await service.listInContext(mockOwner.id)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Manager list failed')
    }
  })

  test('createInContext :: should generate unique stackName for each call', async ({ assert }) => {
    managerStub.createInContext.resolves(mockDatabase as any)

    await service.createInContext(createValidTestData({ name: 'test' }), mockOwner)

    assert.isTrue(
      managerStub.createInContext.calledOnceWith(
        sinon.match({
          stackName: 'a1b2c3d4e5f6',
        }),
        mockOwner.id,
        mockOwner.userId
      )
    )

    managerStub.createInContext.resolves(mockDatabase as any)
    await service.createInContext(createValidTestData({ name: 'org-test' }), mockOrganizationOwner)

    // Both calls should generate stackNames via the generator
    assert.equal(stackNameGeneratorStub.generateUniqueStackName.callCount, 2)
    const secondCall = managerStub.createInContext.getCall(1)
    assert.isTrue(
      secondCall.calledWith(
        sinon.match({
          stackName: 'a1b2c3d4e5f6',
        }),
        mockOrganizationOwner.id,
        mockOrganizationOwner.userId
      )
    )
  })
})
