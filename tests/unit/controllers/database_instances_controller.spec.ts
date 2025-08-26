import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import DatabaseInstancesController from '#controllers/database_instances_controller'
import DatabaseService from '#services/database_instance/database_instance_service'
import DatabaseScopePolicy from '#policies/api/api_database_scope_policy'
import NotFoundException from '#exceptions/not_found_exception'
import {
  createDatabaseInstanceValidator,
  updateDatabaseInstanceValidator,
} from '#validators/database_instances'
import UserFactory from '#database/factories/user_factory'
import User from '#models/user'
import DatabaseInstanceStatsService from '#services/database_instance/helpers/database_instance_stats_service'
import DatabaseJobDispatcher from '#services/database_instance/dispatchers/database_job_dispatcher'
import InstanceStatus from '#enums/instance_status'

test.group('DatabaseInstancesController | Unit', (group) => {
  let controller: DatabaseInstancesController
  let databaseServiceStub: sinon.SinonStubbedInstance<DatabaseService>
  let statsServiceStub: sinon.SinonStubbedInstance<DatabaseInstanceStatsService>
  let jobDispatcherStub: sinon.SinonStubbedInstance<DatabaseJobDispatcher>
  let fakeUser: User
  let validateUsingSpy: sinon.SinonSpy

  const mockOwner = {
    scopes: ['database:read', 'database:write'],
    id: '550e8400-e29b-41d4-a716-446655440001',
  }

  const mockDatabase = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'test-database',
    status: 'PROVISIONING',
    stackName: 'user123_test-database',
    ownerId: '550e8400-e29b-41d4-a716-446655440001',
    ownerType: 'user',
  }

  async function createTestContext(
    authenticatedUser?: User,
    tokenContext?: any,
    validationResult: any = {}
  ) {
    const ctx = {} as any

    // Mock request
    validateUsingSpy = sinon.spy(() => Promise.resolve(validationResult))
    Object.defineProperty(ctx, 'request', {
      value: {
        validateUsing: validateUsingSpy,
        qs: () => (validationResult && validationResult.qs) || {},
      },
      writable: true,
      configurable: true,
    })

    // Mock response
    Object.defineProperty(ctx, 'response', {
      value: {
        unauthorized: sinon.spy((data) => data),
        created: sinon.spy((data) => data),
        noContent: sinon.spy(),
      },
      writable: true,
      configurable: true,
    })

    // Mock auth
    ctx.auth = {
      user: authenticatedUser,
    } as any

    // Mock apiBouncer
    const authorizeSpy = sinon.spy(() => {
      // Simulate authorization failure when owner is null/undefined
      if (!tokenContext) {
        throw new Error('Authorization denied: invalid owner context')
      }
    })
    ctx.apiBouncer = {
      with: sinon.stub().returns({ authorize: authorizeSpy }),
    } as any

    // Mock owner context
    ctx.owner = tokenContext

    // Mock params
    ctx.params = { id: '550e8400-e29b-41d4-a716-446655440002' }

    return { ctx, authorizeSpy }
  }

  group.each.setup(async () => {
    databaseServiceStub = sinon.createStubInstance(DatabaseService)
    statsServiceStub = sinon.createStubInstance(DatabaseInstanceStatsService)
    jobDispatcherStub = sinon.createStubInstance(DatabaseJobDispatcher)

    app.container.swap(DatabaseService, () => databaseServiceStub as any)
    app.container.swap(DatabaseInstanceStatsService, () => statsServiceStub as any)
    app.container.swap(DatabaseJobDispatcher, () => jobDispatcherStub as any)

    controller = await app.container.make(DatabaseInstancesController)
    fakeUser = await UserFactory.make()
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(DatabaseService)
    app.container.restore(DatabaseInstanceStatsService)
    app.container.restore(DatabaseJobDispatcher)
  })

  test('index :: should return databases within token context', async ({ assert }) => {
    const databases = [mockDatabase as any]
    databaseServiceStub.listInContext.resolves(databases)
    statsServiceStub.getStatusCounts.resolves({ [InstanceStatus.PROVISIONING]: 1 } as any)
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, mockOwner)
    const result = await controller.index(ctx)
    assert.isTrue(authorizeSpy.calledOnceWith())
    assert.isTrue(databaseServiceStub.listInContext.calledOnceWith(sinon.match.any))
    assert.property(result, 'meta')
    assert.property(result, 'databases')
    assert.deepEqual(result.databases, databases)
  })

  test('index :: should handle missing owner context', async ({ assert }) => {
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, null)

    try {
      await controller.index(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Authorization denied: invalid owner context')
      assert.isTrue(authorizeSpy.calledOnceWith())
      assert.isFalse(databaseServiceStub.listInContext.called)
    }
  })

  test('store :: should create database within token context', async ({ assert }) => {
    const payload = { name: 'new-database', engine: 'mongodb' }
    databaseServiceStub.createInContext.resolves(mockDatabase as any)

    const { ctx, authorizeSpy } = await createTestContext(fakeUser, mockOwner, payload)

    const result = await controller.store(ctx)

    assert.isTrue(authorizeSpy.calledOnceWith())
    assert.isTrue(validateUsingSpy.calledOnceWith(createDatabaseInstanceValidator))
    assert.isTrue(databaseServiceStub.createInContext.calledOnceWith(payload, mockOwner))
    assert.isTrue((ctx.response.created as sinon.SinonSpy).calledOnceWith(mockDatabase))
    assert.equal(result, mockDatabase)
  })

  test('store :: should handle missing owner context', async ({ assert }) => {
    const payload = { name: 'new-database', engine: 'mongodb' }
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, null, payload)

    try {
      await controller.store(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      // The actual error will depend on whether apiBouncer.authorize fails first or the service fails
      // Let's just check that an error is thrown and the service is not called
      assert.isTrue(authorizeSpy.calledOnceWith())
      assert.isFalse(databaseServiceStub.createInContext.called)
    }
  })

  test('store :: should handle service errors', async ({ assert }) => {
    const payload = { name: 'new-database', engine: 'mongodb' }
    const serviceError = new Error('Database creation failed')
    databaseServiceStub.createInContext.rejects(serviceError)

    const { ctx } = await createTestContext(fakeUser, mockOwner, payload)

    try {
      await controller.store(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database creation failed')
    }
  })

  test('show :: should return database with full details', async ({ assert }) => {
    const databaseWithDetails = { ...mockDatabase, connections: [], deployments: [] }
    databaseServiceStub.findByIdInContext.resolves(databaseWithDetails as any)
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, mockOwner, {
      params: { id: '550e8400-e29b-41d4-a716-446655440002' },
      qs: {},
    })
    const result = await controller.show(ctx)
    assert.isTrue(authorizeSpy.calledOnceWith())
    assert.isTrue(
      databaseServiceStub.findByIdInContext.calledOnceWith({
        id: '550e8400-e29b-41d4-a716-446655440002',
        ownerId: mockOwner.id,
      })
    )
    assert.deepEqual(result, databaseWithDetails)
  })

  test('show :: should throw NotFoundException when database not found', async ({ assert }) => {
    databaseServiceStub.findByIdInContext.resolves(null)

    const { ctx } = await createTestContext(fakeUser, mockOwner, {
      params: { id: '550e8400-e29b-41d4-a716-446655440002' },
    })

    try {
      await controller.show(ctx)
      assert.fail('Expected NotFoundException to be thrown')
    } catch (error) {
      assert.instanceOf(error, NotFoundException)
      assert.equal(error.message, 'Database not found')
    }
  })

  test('show :: should handle missing owner context', async ({ assert }) => {
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, null)

    try {
      await controller.show(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Authorization denied: invalid owner context')
      assert.isTrue(authorizeSpy.calledOnceWith())
      assert.isFalse(databaseServiceStub.findByIdInContext.called)
    }
  })

  test('update :: should update database within token context', async ({ assert }) => {
    const payload = { name: 'updated-database' }
    databaseServiceStub.updateInContext.resolves(mockDatabase as any)

    const { ctx, authorizeSpy } = await createTestContext(fakeUser, mockOwner, {
      params: { id: '550e8400-e29b-41d4-a716-446655440002' },
      ...payload,
    })

    await controller.update(ctx)

    assert.isTrue(authorizeSpy.calledOnceWith())
    assert.isTrue(validateUsingSpy.calledOnceWith(updateDatabaseInstanceValidator))
    assert.isTrue(
      databaseServiceStub.updateInContext.calledOnceWith(
        { id: '550e8400-e29b-41d4-a716-446655440002', ownerId: mockOwner.id },
        payload
      )
    )
    assert.isTrue((ctx.response.noContent as sinon.SinonSpy).calledOnce)
  })

  test('update :: should throw NotFoundException when database not found', async ({ assert }) => {
    const payload = { name: 'updated-database' }
    databaseServiceStub.updateInContext.resolves(null)

    const { ctx } = await createTestContext(fakeUser, mockOwner, {
      params: { id: '550e8400-e29b-41d4-a716-446655440002' },
      ...payload,
    })

    try {
      await controller.update(ctx)
      assert.fail('Expected NotFoundException to be thrown')
    } catch (error) {
      assert.instanceOf(error, NotFoundException)
      assert.equal(error.message, 'Database not found')
    }
  })

  test('update :: should handle missing owner context', async ({ assert }) => {
    const payload = { name: 'updated-database' }
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, null, payload)

    try {
      await controller.update(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Authorization denied: invalid owner context')
      assert.isTrue(authorizeSpy.calledOnceWith())
      assert.isFalse(databaseServiceStub.updateInContext.called)
    }
  })

  test('destroy :: should delete database within token context', async ({ assert }) => {
    databaseServiceStub.deleteInContext.resolves(true)

    const { ctx, authorizeSpy } = await createTestContext(fakeUser, mockOwner, {
      params: { id: '550e8400-e29b-41d4-a716-446655440002' },
    })

    await controller.destroy(ctx)

    assert.isTrue(authorizeSpy.calledOnceWith())
    assert.isTrue(
      databaseServiceStub.deleteInContext.calledOnceWith({
        id: '550e8400-e29b-41d4-a716-446655440002',
        ownerId: mockOwner.id,
      })
    )
    assert.isTrue((ctx.response.noContent as sinon.SinonSpy).calledOnce)
  })

  test('destroy :: should throw NotFoundException when database not found', async ({ assert }) => {
    databaseServiceStub.deleteInContext.resolves(false)

    const { ctx } = await createTestContext(fakeUser, mockOwner, {
      params: { id: '550e8400-e29b-41d4-a716-446655440002' },
    })

    try {
      await controller.destroy(ctx)
      assert.fail('Expected NotFoundException to be thrown')
    } catch (error) {
      assert.instanceOf(error, NotFoundException)
      assert.equal(error.message, 'Database not found')
    }
  })

  test('destroy :: should handle missing owner context', async ({ assert }) => {
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, null)

    try {
      await controller.destroy(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Authorization denied: invalid owner context')
      assert.isTrue(authorizeSpy.calledOnceWith())
      assert.isFalse(databaseServiceStub.deleteInContext.called)
    }
  })

  test('destroy :: should handle service errors', async ({ assert }) => {
    const serviceError = new Error('Database deletion failed')
    databaseServiceStub.deleteInContext.rejects(serviceError)

    const { ctx } = await createTestContext(fakeUser, mockOwner, {
      params: { id: '550e8400-e29b-41d4-a716-446655440002' },
    })

    try {
      await controller.destroy(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Database deletion failed')
    }
  })

  test('all methods :: should require proper authorization', async ({ assert }) => {
    // Stub all service methods to avoid actual database operations
    databaseServiceStub.listInContext.resolves([])
    databaseServiceStub.createInContext.resolves(mockDatabase as any)
    databaseServiceStub.findByIdInContext.resolves(mockDatabase as any)
    databaseServiceStub.updateInContext.resolves(mockDatabase as any)
    databaseServiceStub.deleteInContext.resolves(true)
    statsServiceStub.getStatusCounts.resolves({ [InstanceStatus.PROVISIONING]: 1 } as any)
    const { ctx } = await createTestContext(fakeUser, mockOwner, {
      params: { id: '550e8400-e29b-41d4-a716-446655440002' },
      name: 'test',
      qs: {},
    })
    // Test all methods call bouncer.with(DatabaseScopePolicy)
    await controller.index(ctx)
    await controller.store(ctx)
    await controller.show(ctx)
    await controller.update(ctx)
    await controller.destroy(ctx)
    // Verify apiBouncer.with was called multiple times with DatabaseScopePolicy
    const bouncerCalls = (ctx.apiBouncer.with as sinon.SinonStub).getCalls()
    assert.equal(bouncerCalls.length, 5)
    bouncerCalls.forEach((call) => {
      assert.equal(call.args[0], DatabaseScopePolicy)
    })
  })

  // --- STATS ENDPOINT TESTS ---
  test('stats :: should return quick summary when token context is present', async ({ assert }) => {
    const summary = { total: 5, running: 2, stopped: 1, provisioning: 1, error: 1 }
    statsServiceStub.getQuickSummary.resolves(summary)
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, mockOwner)
    const result = await controller.stats(ctx)
    assert.isTrue(authorizeSpy.calledOnceWith())
    assert.isTrue(statsServiceStub.getQuickSummary.calledOnceWith(mockOwner.id))
    assert.deepEqual(result, summary)
  })

  test('stats :: should handle missing owner context', async ({ assert }) => {
    const { ctx, authorizeSpy } = await createTestContext(fakeUser, null)
    try {
      await controller.stats(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Authorization denied: invalid owner context')
      assert.isTrue(authorizeSpy.calledOnceWith())
      assert.isFalse(statsServiceStub.getQuickSummary.called)
    }
  })

  test('stats :: should handle service errors', async ({ assert }) => {
    const serviceError = new Error('Stats failed')
    statsServiceStub.getQuickSummary.rejects(serviceError)
    const { ctx } = await createTestContext(fakeUser, mockOwner)
    try {
      await controller.stats(ctx)
      assert.fail('Expected error to be thrown')
    } catch (error) {
      assert.equal(error.message, 'Stats failed')
    }
  })
})
