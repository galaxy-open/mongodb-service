import { test } from '@japa/runner'
import sinon from 'sinon'
import app from '@adonisjs/core/services/app'
import DatabaseVersionService from '#services/database_version_service'
import DatabaseVersionRepository from '#repositories/database_version_repository'
import DatabaseEngines from '#enums/database_engines'
import DatabaseVersions from '#enums/database_versions'

test.group('DatabaseVersionService | Unit', (group) => {
  let service: DatabaseVersionService
  let repositoryStub: sinon.SinonStubbedInstance<DatabaseVersionRepository>

  const mockVersions = [
    {
      version: DatabaseVersions.MONGODB_7_0_4,
      displayName: 'MongoDB 7.0.4',
      databaseEngine: DatabaseEngines.MONGODB,
      isActive: true,
      isVisible: true,
    },
    {
      version: DatabaseVersions.MONGODB_6_0_5,
      displayName: 'MongoDB 6.0.5',
      databaseEngine: DatabaseEngines.MONGODB,
      isActive: true,
      isVisible: true,
    },
  ]

  group.each.setup(async () => {
    repositoryStub = sinon.createStubInstance(DatabaseVersionRepository)
    app.container.swap(DatabaseVersionRepository, () => repositoryStub as any)
    service = await app.container.make(DatabaseVersionService)
  })

  group.each.teardown(() => {
    sinon.restore()
    app.container.restore(DatabaseVersionRepository)
  })

  test('getVersions :: should return all versions when no filters provided', async ({ assert }) => {
    repositoryStub.findAll.resolves(mockVersions as any)

    const result = await service.getVersions()

    assert.isTrue(repositoryStub.findAll.calledOnceWith({}))
    assert.deepEqual(result, mockVersions)
  })

  test('getVersions :: should filter by visible when provided', async ({ assert }) => {
    const visibleVersions = mockVersions.filter((v) => v.isVisible)
    repositoryStub.findAll.resolves(visibleVersions as any)

    const result = await service.getVersions({ visible: true })

    assert.isTrue(repositoryStub.findAll.calledOnceWith({ visible: true }))
    assert.deepEqual(result, visibleVersions)
  })

  test('getVersions :: should filter by database engine when provided', async ({ assert }) => {
    const mongoVersions = mockVersions.filter((v) => v.databaseEngine === DatabaseEngines.MONGODB)
    repositoryStub.findAll.resolves(mongoVersions as any)

    const result = await service.getVersions({ databaseEngine: DatabaseEngines.MONGODB })

    assert.isTrue(
      repositoryStub.findAll.calledOnceWith({ databaseEngine: DatabaseEngines.MONGODB })
    )
    assert.deepEqual(result, mongoVersions)
  })

  test('getVersions :: should filter by both visible and database engine', async ({ assert }) => {
    const filteredVersions = mockVersions.filter(
      (v) => v.isVisible && v.databaseEngine === DatabaseEngines.MONGODB
    )
    repositoryStub.findAll.resolves(filteredVersions as any)

    const result = await service.getVersions({
      visible: true,
      databaseEngine: DatabaseEngines.MONGODB,
    })

    assert.isTrue(
      repositoryStub.findAll.calledOnceWith({
        visible: true,
        databaseEngine: DatabaseEngines.MONGODB,
      })
    )
    assert.deepEqual(result, filteredVersions)
  })

  test('getVersions :: should handle empty result', async ({ assert }) => {
    repositoryStub.findAll.resolves([])

    const result = await service.getVersions({ databaseEngine: DatabaseEngines.MONGODB })

    assert.isTrue(
      repositoryStub.findAll.calledOnceWith({ databaseEngine: DatabaseEngines.MONGODB })
    )
    assert.deepEqual(result, [])
  })

  test('getVersions :: should handle visible false filter', async ({ assert }) => {
    const nonVisibleVersions = mockVersions.filter((v) => !v.isVisible)
    repositoryStub.findAll.resolves(nonVisibleVersions as any)

    const result = await service.getVersions({ visible: false })

    assert.isTrue(repositoryStub.findAll.calledOnceWith({ visible: false }))
    assert.deepEqual(result, nonVisibleVersions)
  })
})
