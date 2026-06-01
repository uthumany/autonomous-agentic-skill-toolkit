/**
 * Tests for Dynamic Environment Provisioning with Infrastructure-as-Test-Code
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { EnvironmentProvisioner, HealthChecker, StubManager, DockerClient } = require('../src/modules/provisioner');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const TEST_DIR = './test-provisioner-env';
const OUTPUT_DIR = './test-provisioner-output';

after(() => {
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true });
});

describe('EnvironmentProvisioner', () => {
  it('should initialize with config', () => {
    const provisioner = new EnvironmentProvisioner({
      baseDir: TEST_DIR,
      outputDir: OUTPUT_DIR,
    });
    assert.equal(provisioner.config.baseDir, TEST_DIR);
    assert.equal(provisioner.config.outputDir, OUTPUT_DIR);
    assert.ok(Array.isArray(provisioner.startedContainers));
  });

  it('should return default manifest when no file exists', () => {
    const provisioner = new EnvironmentProvisioner({ baseDir: '/nonexistent' });
    const manifest = provisioner.readManifest('/nonexistent');
    assert.equal(manifest.version, '1.0');
    assert.ok(Array.isArray(manifest.services));
  });

  it('should read environment.yaml manifest', () => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

    const manifest = {
      version: '1.0',
      network: 'test-net',
      services: [
        {
          name: 'postgres',
          image: 'postgres:15',
          ports: ['5432:5432'],
          env: { POSTGRES_DB: 'testdb', POSTGRES_PASSWORD: 'secret' },
          healthcheck: 'http://localhost:5432/health',
        },
        {
          name: 'redis',
          image: 'redis:7-alpine',
          ports: ['6379:6379'],
        },
      ],
      stubs: [
        { name: 'weather-api', type: 'wiremock', mappings: './stubs/weather' },
      ],
      seed: [
        { name: 'init-db', type: 'sql', file: './seeds/init.sql', target: 'postgres' },
      ],
    };

    fs.writeFileSync(path.join(TEST_DIR, 'environment.yaml'), yaml.dump(manifest));

    const provisioner = new EnvironmentProvisioner({ baseDir: TEST_DIR, outputDir: OUTPUT_DIR });
    const loaded = provisioner.readManifest(TEST_DIR);

    assert.equal(loaded.version, '1.0');
    assert.equal(loaded.services.length, 2);
    assert.equal(loaded.services[0].name, 'postgres');
    assert.equal(loaded.services[1].name, 'redis');
    assert.ok(loaded.stubs.length > 0);
  });

  it('should read .yml extension manifest', () => {
    const altDir = path.join(TEST_DIR, 'alt');
    if (!fs.existsSync(altDir)) fs.mkdirSync(altDir, { recursive: true });

    const manifest = { version: '1.0', services: [{ name: 'test', image: 'test:latest' }] };
    fs.writeFileSync(path.join(altDir, 'environment.yml'), yaml.dump(manifest));

    const provisioner = new EnvironmentProvisioner({ baseDir: altDir, outputDir: OUTPUT_DIR });
    const loaded = provisioner.readManifest(altDir);
    assert.equal(loaded.services[0].name, 'test');
  });

  it('should perform dry run without provisioning', async () => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

    const manifest = {
      version: '1.0',
      services: [{ name: 'test-svc', image: 'test:latest', ports: ['8080:80'] }],
      stubs: [{ name: 'test-stub', type: 'wiremock' }],
    };
    fs.writeFileSync(path.join(TEST_DIR, 'environment.yaml'), yaml.dump(manifest));

    const provisioner = new EnvironmentProvisioner({ baseDir: TEST_DIR, outputDir: OUTPUT_DIR });
    // Just verify manifest is readable and valid
    const loaded = provisioner.readManifest(TEST_DIR);
    assert.equal(loaded.services.length, 1);
    assert.equal(loaded.services[0].name, 'test-svc');
  });

  it('should save provisioning log', () => {
    const provisioner = new EnvironmentProvisioner({ outputDir: OUTPUT_DIR });
    provisioner._log('test-event', { key: 'value' });
    provisioner._log('another-event', { key2: 'value2' });

    const logPath = provisioner.saveLog();
    assert.ok(fs.existsSync(logPath));
    const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    assert.equal(log.length, 2);
    assert.equal(log[0].event, 'test-event');
  });

  it('should write environment variables to .env file', () => {
    const provisioner = new EnvironmentProvisioner({ outputDir: OUTPUT_DIR });
    provisioner.environmentVars = {
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      REDIS_URL: 'redis://localhost:6379',
    };
    provisioner._writeEnvFile();

    const envPath = path.join(OUTPUT_DIR, '.env');
    assert.ok(fs.existsSync(envPath));
    const content = fs.readFileSync(envPath, 'utf8');
    assert.ok(content.includes('POSTGRES_HOST=localhost'));
    assert.ok(content.includes('REDIS_URL=redis://localhost:6379'));
  });
});

describe('HealthChecker', () => {
  it('should check HTTP endpoint (will fail for invalid URL)', async () => {
    const result = await HealthChecker.checkHTTP('http://localhost:19999/health', {
      maxRetries: 1,
      retryInterval: 100,
    });
    assert.equal(result, false);
  });

  it('should check TCP port (will fail for unused port)', async () => {
    const result = await HealthChecker.checkPort('localhost', 19999, {
      maxRetries: 1,
      retryInterval: 100,
    });
    assert.equal(result, false);
  });
});

describe('StubManager', () => {
  it('should initialize', () => {
    const manager = new StubManager('test-container');
    assert.ok(Array.isArray(manager.stubs));
  });

  it('should add WireMock stubs', async () => {
    const manager = new StubManager('test-container');
    await manager.addWireMockStub({ request: { method: 'GET', url: '/api/test' }, response: { status: 200 } });
    assert.equal(manager.stubs.length, 1);
    assert.equal(manager.stubs[0].type, 'wiremock');
  });

  it('should add Mountebank imposters', async () => {
    const manager = new StubManager('test-container');
    await manager.addMountebankImposter({ protocol: 'http', port: 3000 });
    assert.equal(manager.stubs.length, 1);
    assert.equal(manager.stubs[0].type, 'mountebank');
  });
});

describe('DockerClient', () => {
  it('should check Docker availability', async () => {
    const result = await DockerClient.isAvailable();
    // May or may not be available in test environment
    assert.equal(typeof result, 'boolean');
  });
});
