import { test } from '@japa/runner'
import DockerCommandBuilderService from '#services/docker_cli/commands/docker_command_builder_service'

test.group('DockerCommandBuilderService | Unit', (group) => {
  let service: DockerCommandBuilderService

  group.each.setup(() => {
    service = new DockerCommandBuilderService()
  })

  test('stackLs :: should return correct stack ls command', ({ assert }) => {
    const result = service.stackLs()
    assert.equal(result.command, 'stack')
    assert.deepEqual(result.args, ['ls', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
    assert.isUndefined(result.stdin)
  })

  test('stackDeploy :: should return correct stack deploy command', ({ assert }) => {
    const result = service.stackDeploy('docker-compose.yml', 'test-stack', true)
    assert.equal(result.command, 'stack')
    assert.deepEqual(result.args, [
      'deploy',
      '--with-registry-auth',
      '-c',
      'docker-compose.yml',
      'test-stack',
    ])
    assert.equal(result.outputType, 'raw_text')
  })

  test('stackDeploy :: should return command without registry auth when false', ({ assert }) => {
    const result = service.stackDeploy('docker-compose.yml', 'test-stack', false)
    assert.equal(result.command, 'stack')
    assert.deepEqual(result.args, ['deploy', '-c', 'docker-compose.yml', 'test-stack'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('stackRm :: should return correct stack rm command', ({ assert }) => {
    const result = service.stackRm('test-stack')
    assert.equal(result.command, 'stack')
    assert.deepEqual(result.args, ['rm', 'test-stack'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('stackServices :: should return correct stack services command', ({ assert }) => {
    const result = service.stackServices('test-stack')
    assert.equal(result.command, 'stack')
    assert.deepEqual(result.args, ['services', 'test-stack', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('serviceLs :: should return correct service ls command', ({ assert }) => {
    const result = service.serviceLs()
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, ['ls', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('serviceInspect :: should return correct service inspect command', ({ assert }) => {
    const result = service.serviceInspect('svc')
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, ['inspect', 'svc'])
    assert.equal(result.outputType, 'json_single')
  })

  test('secretLs :: should return correct secret ls command', ({ assert }) => {
    const result = service.secretLs()
    assert.equal(result.command, 'secret')
    assert.deepEqual(result.args, ['ls', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('secretRm :: should return correct secret rm command', ({ assert }) => {
    const result = service.secretRm('my-secret')
    assert.equal(result.command, 'secret')
    assert.deepEqual(result.args, ['rm', 'my-secret'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('secretCreate :: should return correct secret create command with stdin', ({ assert }) => {
    const result = service.secretCreate('my-secret', 'supersecret')
    assert.equal(result.command, 'secret')
    assert.deepEqual(result.args, ['create', 'my-secret', '-'])
    assert.equal(result.outputType, 'raw_text')
    assert.equal(result.stdin, 'supersecret')
  })

  test('volumeLs :: should return correct volume ls command', ({ assert }) => {
    const result = service.volumeLs(['dangling=true'])
    assert.equal(result.command, 'volume')
    assert.deepEqual(result.args, ['ls', '--filter', 'dangling=true', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('volumeLs :: should return command without filters when none provided', ({ assert }) => {
    const result = service.volumeLs()
    assert.equal(result.command, 'volume')
    assert.deepEqual(result.args, ['ls', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('serviceCreate :: should return correct service create command', ({ assert }) => {
    const result = service.serviceCreate({
      name: 'my-service',
      image: 'nginx:latest',
      detach: true,
      restartCondition: 'any',
      mode: 'replicated',
      mounts: ['type=volume,source=myvol,target=/data'],
      command: ['sh', '-c', 'echo hello'],
    })
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, [
      'create',
      '-d',
      '--name',
      'my-service',
      '--restart-condition',
      'any',
      '--mode',
      'replicated',
      '--mount',
      'type=volume,source=myvol,target=/data',
      'nginx:latest',
      'sh',
      '-c',
      'echo hello',
    ])
    assert.equal(result.outputType, 'raw_text')
  })

  test('serviceRm :: should return correct service rm command', ({ assert }) => {
    const result = service.serviceRm('my-service')
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, ['rm', 'my-service'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('servicePs :: should return correct service ps command with filters', ({ assert }) => {
    const result = service.servicePs('svc', ['foo=bar', 'baz=qux'])
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, [
      'ps',
      '--filter',
      'foo=bar',
      '--filter',
      'baz=qux',
      '--no-trunc',
      'svc',
      '--format',
      'json',
    ])
    assert.equal(result.outputType, 'json_array')
  })

  test('servicePs :: should return correct service ps command without filters', ({ assert }) => {
    const result = service.servicePs('svc')
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, ['ps', '--no-trunc', 'svc', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('serviceUpdate :: should return correct service update command with all options', ({
    assert,
  }) => {
    const result = service.serviceUpdate('svc', {
      limitCpu: '1',
      limitMemory: '2G',
      labelAdd: ['foo=bar'],
      containerLabelAdd: ['baz=qux'],
    })
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, [
      'update',
      '--limit-cpu',
      '1',
      '--limit-memory',
      '2G',
      '--label-add',
      'foo=bar',
      '--container-label-add',
      'baz=qux',
      'svc',
    ])
    assert.equal(result.outputType, 'raw_text')
  })

  test('serviceUpdate :: should return correct service update command with minimal options', ({
    assert,
  }) => {
    const result = service.serviceUpdate('svc', {})
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, ['update', 'svc'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('serviceScale :: should return correct service scale command', ({ assert }) => {
    const result = service.serviceScale('svc', 3)
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, ['scale', 'svc=3'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('run :: should return correct docker run command', ({ assert }) => {
    const result = service.run({
      image: 'alpine',
      command: 'echo',
      args: ['hello'],
      remove: true,
      interactive: true,
      tty: true,
      env: ['FOO=bar'],
      volumes: ['/tmp:/tmp'],
      networks: ['testnet'],
    })
    assert.equal(result.command, 'run')
    assert.deepEqual(result.args, [
      '--rm',
      '-i',
      '-t',
      '-e',
      'FOO=bar',
      '-v',
      '/tmp:/tmp',
      '--network',
      'testnet',
      'alpine',
      'echo',
      'hello',
    ])
    assert.equal(result.outputType, 'raw_text')
  })

  test('run :: should return command with stdin', ({ assert }) => {
    const result = service.run({ image: 'alpine', stdin: 'echo hi' })
    assert.equal(result.command, 'run')
    assert.deepEqual(result.args, ['alpine'])
    assert.equal(result.outputType, 'raw_text')
    assert.equal(result.stdin, 'echo hi')
  })

  test('run :: should handle empty arrays gracefully', ({ assert }) => {
    const result = service.run({
      image: 'alpine',
      env: [],
      volumes: [],
      networks: [],
    })
    assert.equal(result.command, 'run')
    assert.deepEqual(result.args, ['alpine'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('serviceCreate :: should handle all falsy options', ({ assert }) => {
    const result = service.serviceCreate({
      name: 'test',
      image: 'alpine',
      detach: false,
      restartCondition: undefined,
      mode: undefined,
      mounts: undefined,
      command: undefined,
    })
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, ['create', '--name', 'test', 'alpine'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('serviceUpdate :: should handle multiple labels', ({ assert }) => {
    const result = service.serviceUpdate('svc', {
      labelAdd: ['env=prod', 'version=1.0', 'team=backend'],
    })
    assert.equal(result.command, 'service')
    assert.deepEqual(result.args, [
      'update',
      '--label-add',
      'env=prod',
      '--label-add',
      'version=1.0',
      '--label-add',
      'team=backend',
      'svc',
    ])
    assert.equal(result.outputType, 'raw_text')
  })

  test('volumeRm :: should return correct volume rm command', ({ assert }) => {
    const result = service.volumeRm(['vol1', 'vol2'])
    assert.equal(result.command, 'volume')
    assert.deepEqual(result.args, ['rm', 'vol1', 'vol2'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('networkCreate :: should return correct network create command', ({ assert }) => {
    const result = service.networkCreate('testnet', { driver: 'bridge', external: true })
    assert.equal(result.command, 'network')
    assert.deepEqual(result.args, ['create', '--driver', 'bridge', '--external', 'testnet'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('networkCreate :: should return command with minimal options', ({ assert }) => {
    const result = service.networkCreate('net')
    assert.equal(result.command, 'network')
    assert.deepEqual(result.args, ['create', 'net'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('networkLs :: should return correct network ls command', ({ assert }) => {
    const result = service.networkLs()
    assert.equal(result.command, 'network')
    assert.deepEqual(result.args, ['ls', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('networkRm :: should return correct network rm command', ({ assert }) => {
    const result = service.networkRm('testnet')
    assert.equal(result.command, 'network')
    assert.deepEqual(result.args, ['rm', 'testnet'])
    assert.equal(result.outputType, 'raw_text')
  })

  test('ps :: should return correct ps command', ({ assert }) => {
    const result = service.ps()
    assert.equal(result.command, 'ps')
    assert.deepEqual(result.args, ['--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('psAll :: should return correct ps -a command', ({ assert }) => {
    const result = service.psAll()
    assert.equal(result.command, 'ps')
    assert.deepEqual(result.args, ['-a', '--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('images :: should return correct images command', ({ assert }) => {
    const result = service.images()
    assert.equal(result.command, 'images')
    assert.deepEqual(result.args, ['--format', 'json'])
    assert.equal(result.outputType, 'json_array')
  })

  test('inspect :: should return correct inspect command', ({ assert }) => {
    const result = service.inspect('container1')
    assert.equal(result.command, 'inspect')
    assert.deepEqual(result.args, ['container1'])
    assert.equal(result.outputType, 'json_single')
  })
})
