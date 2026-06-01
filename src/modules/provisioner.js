/**
 * Dynamic Environment Provisioning with Infrastructure-as-Test-Code
 *
 * Reads environment.yaml manifests, pulls/builds Docker images,
 * starts containers on ephemeral ports, injects connection strings
 * as env vars, verifies health checks, and performs cascading teardown.
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const http = require('http');

/**
 * Docker command executor
 */
class DockerClient {
  /**
   * Check if Docker is available
   */
  static async isAvailable() {
    return new Promise((resolve) => {
      exec('docker --version', (error) => {
        resolve(!error);
      });
    });
  }

  /**
   * Run a Docker command
   */
  static async run(command, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 120000;
      const child = exec(`docker ${command}`, { timeout }, (error, stdout, stderr) => {
        if (error && !options.allowFailure) {
          reject(new Error(`Docker command failed: ${stderr || error.message}`));
        } else {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: error ? error.code : 0 });
        }
      });
    });
  }

  /**
   * Pull a Docker image
   */
  static async pull(image) {
    console.log(`  [Docker] Pulling ${image}...`);
    return await DockerClient.run(`pull ${image}`);
  }

  /**
   * Start a container
   */
  static async runContainer(image, options = {}) {
    const args = ['run', '-d'];

    // Random port mapping
    if (options.ports) {
      for (const [containerPort, hostPort] of Object.entries(options.ports)) {
        args.push('-p', `${hostPort || 0}:${containerPort}`);
      }
    }

    // Environment variables
    if (options.env) {
      for (const [key, value] of Object.entries(options.env)) {
        args.push('-e', `${key}=${value}`);
      }
    }

    // Volume mounts
    if (options.volumes) {
      for (const [hostPath, containerPath] of Object.entries(options.volumes)) {
        args.push('-v', `${hostPath}:${containerPath}`);
      }
    }

    // Container name
    if (options.name) {
      args.push('--name', options.name);
    }

    // Network
    if (options.network) {
      args.push('--network', options.network);
    }

    // Health check
    if (options.healthcheck) {
      args.push('--health-cmd', options.healthcheck);
    }

    args.push(image);

    // Additional command
    if (options.command) {
      args.push(...options.command.split(' '));
    }

    const result = await DockerClient.run(args.join(' '));
    const containerId = result.stdout.substring(0, 12);
    console.log(`  [Docker] Container started: ${containerId}`);
    return containerId;
  }

  /**
   * Stop and remove a container
  */
  static async stopContainer(containerId) {
    try {
      await DockerClient.run(`stop ${containerId}`, { allowFailure: true });
      await DockerClient.run(`rm ${containerId}`, { allowFailure: true });
      console.log(`  [Docker] Container stopped: ${containerId}`);
    } catch (e) {
      console.warn(`  [Docker] Failed to stop ${containerId}: ${e.message}`);
    }
  }

  /**
   * Get container logs
   */
  static async logs(containerId, tail = 100) {
    const result = await DockerClient.run(`logs --tail ${tail} ${containerId}`, { allowFailure: true });
    return result.stdout;
  }

  /**
   * Get container port mapping
   */
  static async getPortMapping(containerId) {
    const result = await DockerClient.run(
      `inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{$p}}->{{(index $conf 0).HostPort}}{{println}}{{end}}' ${containerId}`,
      { allowFailure: true }
    );
    return result.stdout;
  }

  /**
   * Execute command inside a running container
   */
  static async execInContainer(containerId, command) {
    return await DockerClient.run(`exec ${containerId} ${command}`, { allowFailure: true });
  }
}

/**
 * HTTP health checker
 */
class HealthChecker {
  /**
   * Check if an HTTP endpoint is healthy
   */
  static async checkHTTP(url, options = {}) {
    const maxRetries = options.maxRetries || 10;
    const retryInterval = options.retryInterval || 2000;
    const timeout = options.timeout || 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await new Promise((resolve, reject) => {
          const req = http.get(url, { timeout }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              resolve({ status: res.statusCode, body: data });
            });
          });
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });

        if (result.status >= 200 && result.status < 400) {
          console.log(`  [Health] ${url} is healthy (attempt ${attempt})`);
          return true;
        }
      } catch (e) {
        // Will retry
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }

    console.warn(`  [Health] ${url} failed health check after ${maxRetries} attempts`);
    return false;
  }

  /**
   * Check if a TCP port is open
   */
  static async checkPort(host, port, options = {}) {
    const maxRetries = options.maxRetries || 10;
    const retryInterval = options.retryInterval || 1000;

    const net = require('net');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          const socket = new net.Socket();
          socket.setTimeout(3000);
          socket.connect(port, host, () => {
            socket.destroy();
            resolve();
          });
          socket.on('error', reject);
          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Timeout'));
          });
        });
        return true;
      } catch (e) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
      }
    }
    return false;
  }
}

/**
 * WireMock/Mountebank stub manager
 */
class StubManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.stubs = [];
  }

  /**
   * Add a WireMock mapping stub
   */
  async addWireMockStub(mapping) {
    this.stubs.push({ type: 'wiremock', ...mapping });
    return mapping;
  }

  /**
   * Add a Mountebank imposter
   */
  async addMountebankImposter(imposter) {
    this.stubs.push({ type: 'mountebank', ...imposter });
    return imposter;
  }

  /**
   * Load stubs from a directory
   */
  async loadFromDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml'));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf8');

      if (file.endsWith('.json')) {
        const stub = JSON.parse(content);
        this.stubs.push(stub);
      } else {
        const stub = yaml.load(content);
        this.stubs.push(stub);
      }
    }

    console.log(`  [Stubs] Loaded ${this.stubs.length} stub(s) from ${dirPath}`);
    return this.stubs;
  }
}

/**
 * Environment provisioner — the main orchestrator
 */
class EnvironmentProvisioner {
  constructor(config = {}) {
    this.config = {
      baseDir: config.baseDir || process.cwd(),
      outputDir: config.outputDir || './aast-provision-results',
      dockerNetwork: config.dockerNetwork || 'aast-test-net',
      ...config,
    };

    this.startedContainers = [];
    this.environmentVars = {};
    this.provisioningLog = [];
  }

  /**
   * Read and parse environment.yaml manifest
   */
  readManifest(testDir) {
    const manifestPath = path.join(testDir, 'environment.yaml');
    const altPath = path.join(testDir, 'environment.yml');

    if (!fs.existsSync(manifestPath) && !fs.existsSync(altPath)) {
      console.log('[Provisioner] No environment.yaml found — running with default config');
      return this._defaultManifest();
    }

    const actualPath = fs.existsSync(manifestPath) ? manifestPath : altPath;
    const content = fs.readFileSync(actualPath, 'utf8');
    const manifest = yaml.load(content);

    console.log(`[Provisioner] Loaded manifest from ${actualPath}`);
    this._log('manifest-loaded', { path: actualPath });
    return manifest;
  }

  _defaultManifest() {
    return {
      version: '1.0',
      services: [],
      stubs: [],
      network: this.config.dockerNetwork,
    };
  }

  /**
   * Provision the full environment from a manifest
   */
  async provision(manifest, testDir) {
    console.log('\n[Provisioner] Starting environment provisioning...');
    const startTime = Date.now();
    const provisionResult = {
      success: true,
      services: [],
      envVars: {},
      errors: [],
    };

    // Check Docker availability
    const dockerAvailable = await DockerClient.isAvailable();
    if (!dockerAvailable) {
      console.warn('[Provisioner] Docker not available — skipping container provisioning');
      this._log('docker-unavailable', {});
      // Continue without Docker (stubs-only mode)
    }

    // Create Docker network
    if (dockerAvailable && manifest.services && manifest.services.length > 0) {
      try {
        await DockerClient.run(`network create ${manifest.network || this.config.dockerNetwork}`, { allowFailure: true });
      } catch (e) {
        // Network may already exist
      }
    }

    // Provision each service
    if (manifest.services && dockerAvailable) {
      for (const service of manifest.services) {
        try {
          const result = await this._provisionService(service, manifest);
          provisionResult.services.push(result);

          // Inject environment variables
          if (result.envVars) {
            Object.assign(this.environmentVars, result.envVars);
            Object.assign(provisionResult.envVars, result.envVars);
          }
        } catch (error) {
          provisionResult.errors.push({ service: service.name, error: error.message });
          provisionResult.success = false;
          console.error(`  [Provisioner] Failed to provision ${service.name}: ${error.message}`);
        }
      }
    }

    // Load stubs
    if (manifest.stubs) {
      for (const stubConfig of manifest.stubs) {
        try {
          await this._provisionStub(stubConfig, testDir);
        } catch (error) {
          provisionResult.errors.push({ stub: stubConfig.name, error: error.message });
          console.error(`  [Provisioner] Failed to load stub ${stubConfig.name}: ${error.message}`);
        }
      }
    }

    // Seed data
    if (manifest.seed) {
      for (const seedConfig of manifest.seed) {
        try {
          await this._runSeed(seedConfig);
        } catch (error) {
          provisionResult.errors.push({ seed: seedConfig.name, error: error.message });
          console.error(`  [Provisioner] Failed to run seed ${seedConfig.name}: ${error.message}`);
        }
      }
    }

    provisionResult.durationMs = Date.now() - startTime;
    provisionResult.envVars = this.environmentVars;

    // Write env vars to a file for test runners to consume
    this._writeEnvFile();

    console.log(`[Provisioner] Provisioning complete in ${provisionResult.durationMs}ms`);
    console.log(`[Provisioner] ${provisionResult.services.length} services started, ${provisionResult.errors.length} errors`);
    this._log('provision-complete', provisionResult);

    return provisionResult;
  }

  async _provisionService(service, manifest) {
    console.log(`  [Provisioner] Provisioning service: ${service.name} (${service.image})`);

    // Pull image if needed
    if (service.pull !== false) {
      await DockerClient.run(`pull ${service.image}`);
    }

    // Build port mappings
    const ports = {};
    if (service.ports) {
      for (const port of service.ports) {
        const [containerPort, hostPort] = String(port).split(':');
        ports[containerPort] = hostPort || 0;
      }
    }

    // Start container
    const containerId = await DockerClient.runContainer(service.image, {
      name: `aast-${service.name}`,
      ports,
      env: service.env || {},
      volumes: service.volumes || {},
      network: manifest.network || this.config.dockerNetwork,
      command: service.command,
    });

    this.startedContainers.push({ id: containerId, name: service.name });

    // Wait for health check
    if (service.healthcheck) {
      const healthy = await HealthChecker.checkHTTP(service.healthcheck, {
        maxRetries: service.retries || 15,
        retryInterval: service.retryInterval || 2000,
      });
      if (!healthy) {
        console.warn(`  [Provisioner] Warning: ${service.name} may not be healthy`);
      }
    } else if (service.ports && service.ports.length > 0) {
      // Default: check if port is open
      const port = String(service.ports[0]).split(':')[0];
      await HealthChecker.checkPort('localhost', parseInt(port), { maxRetries: 10 });
    }

    // Get actual port mappings
    const portMapping = await DockerClient.getPortMapping(containerId);

    // Build environment variables for test consumers
    const envVars = {};
    envVars[`${service.name.toUpperCase()}_HOST`] = 'localhost';
    if (service.ports && service.ports.length > 0) {
      const port = String(service.ports[0]).split(':')[0];
      envVars[`${service.name.toUpperCase()}_PORT`] = port;
      envVars[`${service.name.toUpperCase()}_URL`] = `http://localhost:${port}`;
    }
    if (service.env) {
      for (const [key, value] of Object.entries(service.env)) {
        envVars[`${service.name.toUpperCase()}_${key.toUpperCase()}`] = value;
      }
    }

    return {
      name: service.name,
      image: service.image,
      containerId,
      portMapping,
      envVars,
      healthy: true,
    };
  }

  async _provisionStub(stubConfig, testDir) {
    console.log(`  [Provisioner] Loading stub: ${stubConfig.name}`);

    const stubManager = new StubManager(null);

    if (stubConfig.type === 'wiremock') {
      if (stubConfig.mappings) {
        const mappingsPath = path.resolve(testDir, stubConfig.mappings);
        if (fs.existsSync(mappingsPath)) {
          const files = fs.readdirSync(mappingsPath);
          for (const file of files) {
            const content = JSON.parse(fs.readFileSync(path.join(mappingsPath, file), 'utf8'));
            await stubManager.addWireMockStub(content);
          }
        }
      }
    } else if (stubConfig.type === 'mountebank') {
      if (stubConfig.imposters) {
        const imposterPath = path.resolve(testDir, stubConfig.imposters);
        if (fs.existsSync(imposterPath)) {
          const content = JSON.parse(fs.readFileSync(imposterPath, 'utf8'));
          await stubManager.addMountebankImposter(content);
        }
      }
    }

    return stubManager;
  }

  async _runSeed(seedConfig) {
    console.log(`  [Provisioner] Running seed: ${seedConfig.name}`);

    if (seedConfig.type === 'sql' && seedConfig.file) {
      // Find which container to run SQL against
      const targetService = this.startedContainers.find((c) => c.name === seedConfig.target);
      if (targetService) {
        const sqlContent = fs.readFileSync(seedConfig.file, 'utf8');
        // Write SQL to container and execute
        const tempPath = `/tmp/aast_seed_${Date.now()}.sql`;
        await DockerClient.execInContainer(targetService.id, `sh -c "echo '${sqlContent.replace(/'/g, "'\\''")}' > ${tempPath}"`);
        await DockerClient.execInContainer(targetService.id, seedConfig.exec || `psql -f ${tempPath}`);
      }
    }

    if (seedConfig.type === 'script' && seedConfig.file) {
      const scriptPath = path.resolve(seedConfig.file);
      await new Promise((resolve, reject) => {
        exec(`bash ${scriptPath}`, { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
    }
  }

  _writeEnvFile() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const envContent = Object.entries(this.environmentVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const envPath = path.join(this.config.outputDir, '.env');
    fs.writeFileSync(envPath, envContent);
    console.log(`[Provisioner] Environment variables written to ${envPath}`);
  }

  /**
   * Teardown all provisioned resources
   */
  async teardown() {
    console.log('\n[Provisioner] Tearing down environment...');
    const logs = {};

    // Capture container logs before stopping
    for (const container of this.startedContainers) {
      try {
        const containerLogs = await DockerClient.logs(container.id, 200);
        logs[container.name] = containerLogs;
      } catch (e) {
        logs[container.name] = `Failed to capture logs: ${e.message}`;
      }
    }

    // Stop and remove containers in reverse order (cascading)
    for (let i = this.startedContainers.length - 1; i >= 0; i--) {
      const container = this.startedContainers[i];
      await DockerClient.stopContainer(container.id);
    }

    // Remove Docker network
    try {
      await DockerClient.run(`network rm ${this.config.dockerNetwork}`, { allowFailure: true });
    } catch (e) {
      // Network may not exist
    }

    this.startedContainers = [];
    this.environmentVars = {};

    // Save container logs
    if (Object.keys(logs).length > 0) {
      this._saveContainerLogs(logs);
    }

    console.log('[Provisioner] Teardown complete');
    return logs;
  }

  _saveContainerLogs(logs) {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    for (const [name, log] of Object.entries(logs)) {
      const logPath = path.join(this.config.outputDir, `${name}-container.log`);
      fs.writeFileSync(logPath, log);
    }
    console.log('[Provisioner] Container logs archived');
  }

  _log(event, data) {
    this.provisioningLog.push({
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Save provisioning log
   */
  saveLog() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    const logPath = path.join(this.config.outputDir, `provisioning-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(this.provisioningLog, null, 2));
    return logPath;
  }
}

module.exports = { EnvironmentProvisioner, DockerClient, HealthChecker, StubManager };
