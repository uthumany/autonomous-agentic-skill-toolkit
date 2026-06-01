/**
 * Tests for Parallel Execution Engine with Resource Pooling
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { ParallelEngine, ResourcePool, TaskQueue, Worker } = require('../src/modules/parallel');
const fs = require('fs');

describe('TaskQueue', () => {
  it('should enqueue and dequeue tasks in priority order', () => {
    const queue = new TaskQueue();
    queue.enqueue({ name: 'low' }, 1);
    queue.enqueue({ name: 'high' }, 10);
    queue.enqueue({ name: 'medium' }, 5);

    assert.equal(queue.size, 3);
    assert.equal(queue.dequeue().name, 'high');
    assert.equal(queue.dequeue().name, 'medium');
    assert.equal(queue.dequeue().name, 'low');
    assert.equal(queue.size, 0);
  });

  it('should return null when dequeueing empty queue', () => {
    const queue = new TaskQueue();
    assert.equal(queue.dequeue(), null);
  });

  it('should requeue tasks', () => {
    const queue = new TaskQueue();
    queue.enqueue({ name: 'task1', id: '1' }, 1);
    const task = queue.dequeue();
    queue.requeue(task);
    assert.equal(queue.size, 1);
    assert.equal(queue.dequeue().name, 'task1');
  });

  it('should list all tasks', () => {
    const queue = new TaskQueue();
    queue.enqueue({ name: 'a' }, 1);
    queue.enqueue({ name: 'b' }, 2);
    const all = queue.all;
    assert.equal(all.length, 2);
  });
});

describe('ResourcePool', () => {
  let pool;

  before(() => {
    pool = new ResourcePool({
      maxWorkers: 2,
      resourceCaps: { browser: 2, mobile: 1, desktop: 1 },
    });
  });

  it('should initialize with correct caps', () => {
    const status = pool.getStatus();
    assert.equal(status.maxWorkers, 2);
    assert.equal(status.resourceCaps.browser, 2);
    assert.equal(status.resourceCaps.mobile, 1);
  });

  it('should track active resources', async () => {
    const status = pool.getStatus();
    assert.equal(status.active, 0);
    assert.equal(status.created, 0);
  });
});

describe('ParallelEngine', () => {
  let engine;

  before(() => {
    engine = new ParallelEngine({
      maxWorkers: 2,
      outputDir: './test-parallel-output',
    });
  });

  after(() => {
    if (fs.existsSync('./test-parallel-output')) {
      fs.rmSync('./test-parallel-output', { recursive: true });
    }
  });

  it('should initialize with config', () => {
    assert.equal(engine.config.maxWorkers, 2);
    assert.ok(engine.pool);
    assert.ok(engine.queue);
  });

  it('should decompose test suite into tasks', () => {
    const testSuite = [
      { name: 'test1', execute: async () => {} },
      { name: 'test2', execute: async () => {} },
      { name: 'test3', execute: async () => {}, priority: 10 },
    ];

    const tasks = engine.decomposeTests(testSuite);
    assert.equal(tasks.length, 3);
    assert.equal(tasks[0].name, 'test1');
    assert.equal(tasks[2].priority, 10);
  });

  it('should run a simple test suite', async () => {
    const results = [];
    const testSuite = [
      {
        name: 'test-a',
        resourceType: 'none',
        execute: async (page) => {
          results.push('a');
          return { name: 'a' };
        },
      },
      {
        name: 'test-b',
        resourceType: 'none',
        execute: async (page) => {
          results.push('b');
          return { name: 'b' };
        },
      },
    ];

    const summary = await engine.runSuite(testSuite);
    assert.equal(summary.totalTasks, 2);
    assert.equal(summary.completed, 2);
    assert.equal(summary.failed, 0);
    assert.ok(summary.totalDurationMs >= 0);
    assert.ok(summary.workerStats.length > 0);
  });

  it('should handle task failures gracefully', async () => {
    const testSuite = [
      {
        name: 'failing-test',
        resourceType: 'none',
        execute: async () => {
          throw new Error('Intentional failure');
        },
      },
      {
        name: 'passing-test',
        resourceType: 'none',
        execute: async () => {
          return { ok: true };
        },
      },
    ];

    const summary = await engine.runSuite(testSuite);
    assert.equal(summary.totalTasks, 2);
    assert.equal(summary.failed, 1);
    assert.equal(summary.completed, 1);
  });

  it('should emit events during execution', async () => {
    const events = [];
    engine.on('suite-started', (data) => events.push({ type: 'started', ...data }));
    engine.on('task-completed', (data) => events.push({ type: 'task-done', ...data }));
    engine.on('suite-completed', (data) => events.push({ type: 'completed', ...data }));

    const testSuite = [
      { name: 'ev-test', resourceType: 'none', execute: async () => {} },
    ];

    await engine.runSuite(testSuite);
    assert.ok(events.some((e) => e.type === 'started'));
    assert.ok(events.some((e) => e.type === 'task-done'));
    assert.ok(events.some((e) => e.type === 'completed'));
  });
});
