/**
 * Parallel Execution Engine with Resource Pooling
 *
 * Central dispatcher maintains a live pool of browser instances,
 * device emulators, and desktop hooks. Decomposes test suites into
 * atomic tasks, manages workers with resource affinity, handles
 * crash recovery, and streams results in real-time.
 */

const { chromium, webkit, firefox } = require('playwright');
const { EventEmitter } = require('events');
const os = require('os');
const path = require('path');
const fs = require('fs');

const BROWSER_TYPES = { chromium, webkit, firefox };

/**
 * Resource pool managing browser instances and device contexts
 */
class ResourcePool extends EventEmitter {
  constructor(config = {}) {
    super();
    this.maxWorkers = config.maxWorkers || Math.min(os.cpus().length, 4);
    this.maxMemoryPerWorker = config.maxMemoryPerWorker || 512 * 1024 * 1024; // 512MB
    this.activeWorkers = new Map();
    this.idleWorkers = [];
    this.resourceCaps = config.resourceCaps || { browser: 4, mobile: 2, desktop: 1 };
    this.currentCounts = { browser: 0, mobile: 0, desktop: 0 };
    this.totalCreated = 0;
    this.totalDestroyed = 0;
  }

  /**
   * Acquire a resource from the pool (or create new if under cap)
   */
  async acquire(type = 'browser', options = {}) {
    const cap = this.resourceCaps[type] || this.resourceCaps.browser;

    if (this.currentCounts[type] >= cap) {
      this.emit('resource-waiting', { type, queued: this.currentCounts[type] });
      await this._waitForAvailable(type);
    }

    let browser, context, page;

    try {
      const browserType = BROWSER_TYPES[options.browserType] || chromium;
      browser = await browserType.launch({
        headless: options.headless !== false,
        args: options.args || [],
      });

      if (options.device) {
        const { devices } = require('playwright');
        const deviceDescriptor = devices[options.device] || devices['iPhone 11'];
        context = await browser.newContext({ ...deviceDescriptor });
      } else {
        context = await browser.newContext(options.contextOptions || {});
      }

      page = await context.newPage();
      this.currentCounts[type]++;
      this.totalCreated++;

      const resourceId = `res_${this.totalCreated}`;
      const resource = { id: resourceId, type, browser, context, page, createdAt: Date.now() };
      this.activeWorkers.set(resourceId, resource);

      this.emit('resource-acquired', { id: resourceId, type });
      return resource;
    } catch (error) {
      if (browser) await browser.close().catch(() => {});
      throw error;
    }
  }

  /**
   * Release a resource back to the pool
   */
  async release(resourceId) {
    const resource = this.activeWorkers.get(resourceId);
    if (!resource) return;

    try {
      await resource.browser.close();
    } catch (e) {
      // Browser may already be crashed
    }

    this.activeWorkers.delete(resourceId);
    this.currentCounts[resource.type]--;
    this.totalDestroyed++;

    this.emit('resource-released', { id: resourceId, type: resource.type });
  }

  /**
   * Check for crashed contexts and auto-respawn
   */
  async respawnIfCrashed(resourceId) {
    const resource = this.activeWorkers.get(resourceId);
    if (!resource) return null;

    try {
      // Test if browser is still alive
      await resource.page.evaluate(() => true);
      return resource;
    } catch (e) {
      // Browser crashed — release and respawn
      const type = resource.type;
      await this.release(resourceId);
      this.emit('resource-crashed', { id: resourceId, type });
      return await this.acquire(type);
    }
  }

  async _waitForAvailable(type) {
    return new Promise((resolve) => {
      const check = () => {
        const cap = this.resourceCaps[type] || this.resourceCaps.browser;
        if (this.currentCounts[type] < cap) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      active: this.activeWorkers.size,
      created: this.totalCreated,
      destroyed: this.totalDestroyed,
      currentCounts: { ...this.currentCounts },
      resourceCaps: { ...this.resourceCaps },
      maxWorkers: this.maxWorkers,
    };
  }

  /**
   * Destroy all resources
   */
  async destroyAll() {
    for (const [id, resource] of this.activeWorkers) {
      try {
        await resource.browser.close();
      } catch (e) { /* ignore */ }
      this.currentCounts[resource.type]--;
    }
    this.activeWorkers.clear();
    this.totalDestroyed += this.activeWorkers.size;
  }
}

/**
 * Task queue with priority support
 */
class TaskQueue {
  constructor() {
    this.tasks = [];
  }

  enqueue(task, priority = 0) {
    this.tasks.push({
      ...task,
      priority,
      id: task.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'pending',
      enqueuedAt: Date.now(),
    });
    // Sort by priority descending
    this.tasks.sort((a, b) => b.priority - a.priority);
  }

  dequeue() {
    return this.tasks.shift() || null;
  }

  requeue(task) {
    task.status = 'pending';
    task.requeuedAt = Date.now();
    this.tasks.push(task);
    this.tasks.sort((a, b) => b.priority - a.priority);
  }

  get size() {
    return this.tasks.length;
  }

  get all() {
    return [...this.tasks];
  }
}

/**
 * Worker that claims and executes tasks
 */
class Worker {
  constructor(id, pool, config) {
    this.id = id;
    this.pool = pool;
    this.config = config;
    this.currentTask = null;
    this.completedTasks = [];
    this.errors = [];
    this.isRunning = false;
  }

  async run(task, onResult) {
    this.currentTask = task;
    task.status = 'running';
    task.workerId = this.id;
    task.startedAt = Date.now();

    const resourceType = task.resourceType || 'browser';
    const options = task.resourceOptions || {};

    let resource = null;
    try {
      // Only acquire a resource if the task needs one
      if (resourceType !== 'none' && resourceType !== null) {
        resource = await this.pool.acquire(resourceType, options);
      }
      const result = resource
        ? await task.execute(resource.page, resource.context)
        : await task.execute(null, null);
      task.status = 'completed';
      task.result = result;
      task.completedAt = Date.now();
      task.durationMs = task.completedAt - task.startedAt;
      this.completedTasks.push(task);
      if (onResult) onResult(task);
    } catch (error) {
      task.status = 'failed';
      task.error = { message: error.message, stack: error.stack };
      task.completedAt = Date.now();
      task.durationMs = task.completedAt - task.startedAt;
      this.errors.push({ taskId: task.id, error: task.error });

      // Try to respawn if crashed
      if (resource) {
        await this.pool.respawnIfCrashed(resource.id);
      }

      if (onResult) onResult(task);
    } finally {
      if (resource) {
        await this.pool.release(resource.id);
      }
      this.currentTask = null;
    }
  }

  getStatus() {
    return {
      id: this.id,
      running: !!this.currentTask,
      currentTaskId: this.currentTask?.id || null,
      completed: this.completedTasks.length,
      errors: this.errors.length,
    };
  }
}

/**
 * Parallel execution engine — the main orchestrator
 */
class ParallelEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxWorkers: config.maxWorkers || 4,
      resourceCaps: config.resourceCaps || { browser: 4, mobile: 2, desktop: 1 },
      outputDir: config.outputDir || './aast-parallel-results',
      timeout: config.timeout || 60000,
      ...config,
    };

    this.pool = new ResourcePool(this.config);
    this.queue = new TaskQueue();
    this.workers = [];
    this.results = [];
    this.isRunning = false;

    // Pool events
    this.pool.on('resource-crashed', (data) => {
      this.emit('worker-resource-crashed', data);
    });
    this.pool.on('resource-waiting', (data) => {
      this.emit('resource-queueing', data);
    });
  }

  /**
   * Decompose a test suite into atomic tasks
   */
  decomposeTests(testSuite) {
    const tasks = [];
    for (const test of testSuite) {
      const task = {
        id: test.id || `test_${tasks.length}`,
        name: test.name,
        resourceType: test.resourceType || 'browser',
        resourceOptions: test.resourceOptions || {},
        priority: test.priority || 0,
        execute: test.execute,
      };
      tasks.push(task);
    }
    return tasks;
  }

  /**
   * Run all tasks from a test suite in parallel
   */
  async runSuite(testSuite, options = {}) {
    this.isRunning = true;
    this.results = []; // Reset results for fresh run
    const startTime = Date.now();

    // Decompose into atomic tasks
    const tasks = this.decomposeTests(testSuite);
    for (const task of tasks) {
      this.queue.enqueue(task, task.priority);
    }

    this.emit('suite-started', { totalTasks: tasks.length });

    // Create workers and process queue
    const workers = [];
    for (let i = 0; i < this.config.maxWorkers; i++) {
      const worker = new Worker(`worker_${i}`, this.pool, this.config);
      workers.push(worker);
    }
    this.workers = workers;

    // Process tasks through workers
    const resultPromises = [];
    const processNext = async (worker) => {
      while (this.queue.size > 0) {
        const task = this.queue.dequeue();
        if (!task) break;

        await worker.run(task, (completedTask) => {
          this.results.push(completedTask);
          this.emit('task-completed', {
            taskId: completedTask.id,
            status: completedTask.status,
            workerId: worker.id,
            remaining: this.queue.size,
          });
        });
      }
    };

    // Start all workers processing the queue
    for (const worker of workers) {
      resultPromises.push(processNext(worker));
    }

    // Wait for all workers to finish
    await Promise.all(resultPromises);

    // Cleanup
    await this.pool.destroyAll();
    this.isRunning = false;

    const totalTime = Date.now() - startTime;

    // Build summary
    const summary = {
      totalTasks: tasks.length,
      completed: this.results.filter((r) => r.status === 'completed').length,
      failed: this.results.filter((r) => r.status === 'failed').length,
      totalDurationMs: totalTime,
      avgTaskDurationMs: this.results.length > 0
        ? Math.round(this.results.reduce((sum, r) => sum + (r.durationMs || 0), 0) / this.results.length)
        : 0,
      workerStats: workers.map((w) => w.getStatus()),
      poolStats: this.pool.getStatus(),
      results: this.results.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        durationMs: r.durationMs,
        error: r.error,
      })),
    };

    this.emit('suite-completed', summary);

    if (options.output) {
      this.saveResults(summary);
    }

    return summary;
  }

  /**
   * Save results to disk
   */
  saveResults(summary) {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    const filePath = path.join(this.config.outputDir, `parallel-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
    return filePath;
  }
}

module.exports = { ParallelEngine, ResourcePool, TaskQueue, Worker };
