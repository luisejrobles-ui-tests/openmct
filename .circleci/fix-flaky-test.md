# Fixing Flaky Tests Guide - OpenMCT

## Overview
This guide provides best practices for fixing flaky tests in our OpenMCT + Jasmine + Karma application. Flaky tests are tests that sometimes pass and sometimes fail due to timing issues, race conditions, or other non-deterministic behavior.

## Command Restrictions

- You MUST NOT use `sleep()` or `setTimeout()` for delays in test scripts
- You MUST NOT use `eval()` as it poses security risks
- Avoid using shell wildcards in destructive operations (e.g., `rm -rf *`)
- Never use fixed timeouts like `setTimeout(() => {}, 1000)` in tests

## Code Style Preferences

- Prefer functional programming patterns over imperative code
- Use explicit error handling over try-catch-all patterns
- Use async/await syntax over Promise chains for readability
- Always use proper OpenMCT application state cleanup
- Prefer Jasmine's `done()` callbacks for async operations

## Security Considerations

- Always flag use of `innerHTML` without sanitization
- Highlight any potential XSS vulnerabilities in DOM manipulation
- Point out hardcoded credentials or API keys
- Flag any use of `eval()` or `Function()` constructors
- Ensure proper validation of telemetry data inputs

## Documentation Standards

- Complex OpenMCT plugin interactions MUST include explanatory comments
- Flaky test fixes MUST document the root cause and solution
- Test setup and teardown MUST be clearly documented
- Mock implementations MUST be documented with their purpose

## Common Flaky Test Patterns & Solutions

### 1. Race Conditions with OpenMCT Initialization

#### ❌ **Problematic Code:**
```javascript
it('should initialize components with proper timing', (done) => {
  let initializationComplete = false;
  let componentCheckComplete = false;
  
  // Mock async initialization with random delay
  const mockAsyncInit = () => {
    return new Promise((resolve) => {
      const delay = Math.random() * 150 + 50; // Random delay
      setTimeout(() => {
        initializationComplete = true;
        resolve();
      }, delay);
    });
  };

  mockAsyncInit().then(() => {
    // Check components immediately after promise resolves
    setTimeout(() => {
      componentCheckComplete = true;
      expect(openmct.components).toBeDefined();
      expect(openmct.components.ObjectView).toBeDefined();
      done();
    }, 10); // Very short delay - often not enough
  });

  // This assertion will fail ~60% of the time
  setTimeout(() => {
    expect(initializationComplete).toBe(true);
    expect(componentCheckComplete).toBe(true);
  }, 100);
});
```

#### ✅ **Fixed Code:**
```javascript
it('should initialize components with proper timing', async () => {
  let initializationComplete = false;
  
  // Mock async initialization with proper handling
  const mockAsyncInit = async () => {
    const delay = Math.random() * 150 + 50;
    await new Promise(resolve => setTimeout(resolve, delay));
    initializationComplete = true;
  };

  await mockAsyncInit();

  // Wait for OpenMCT to be fully initialized
  await new Promise(resolve => {
    const checkInitialization = () => {
      if (openmct.components && openmct.components.ObjectView) {
        resolve();
      } else {
        setTimeout(checkInitialization, 50);
      }
    };
    checkInitialization();
  });

  expect(initializationComplete).toBe(true);
  expect(openmct.components).toBeDefined();
  expect(openmct.components.ObjectView).toBeDefined();
});
```

### 2. Event Timing with Multiple Listeners

#### ❌ **Problematic Code:**
```javascript
it('should handle multiple event listeners correctly', (done) => {
  let eventCount = 0;
  let lastEventTime = 0;
  
  // Mock event system with timing issues
  const mockEventEmitter = {
    listeners: [],
    on: function(event, callback) {
      this.listeners.push({ event, callback });
    },
    emit: function(event, data) {
      const eventListeners = this.listeners.filter(l => l.event === event);
      // Simulate async event processing with random delays
      eventListeners.forEach(listener => {
        setTimeout(() => {
          listener.callback(data);
          eventCount++;
          lastEventTime = Date.now();
        }, Math.random() * 100 + 20);
      });
    }
  };

  // Add multiple listeners
  mockEventEmitter.on('test-event', () => {});
  mockEventEmitter.on('test-event', () => {});
  mockEventEmitter.on('test-event', () => {});

  // Emit event
  mockEventEmitter.emit('test-event', { test: 'data' });

  // Check results too early
  setTimeout(() => {
    expect(eventCount).toBe(3); // FLAKY!
    expect(lastEventTime).toBeGreaterThan(0); // FLAKY!
    done();
  }, 50);
});
```

#### ✅ **Fixed Code:**
```javascript
it('should handle multiple event listeners correctly', async () => {
  let eventCount = 0;
  let lastEventTime = 0;
  
  // Mock event system with proper async handling
  const mockEventEmitter = {
    listeners: [],
    on: function(event, callback) {
      this.listeners.push({ event, callback });
    },
    emit: async function(event, data) {
      const eventListeners = this.listeners.filter(l => l.event === event);
      
      // Process all listeners and wait for completion
      const promises = eventListeners.map(listener => {
        return new Promise(resolve => {
          setTimeout(() => {
            listener.callback(data);
            eventCount++;
            lastEventTime = Date.now();
            resolve();
          }, Math.random() * 100 + 20);
        });
      });
      
      await Promise.all(promises);
    }
  };

  // Add multiple listeners
  mockEventEmitter.on('test-event', () => {});
  mockEventEmitter.on('test-event', () => {});
  mockEventEmitter.on('test-event', () => {});

  // Emit event and wait for completion
  await mockEventEmitter.emit('test-event', { test: 'data' });

  expect(eventCount).toBe(3);
  expect(lastEventTime).toBeGreaterThan(0);
});
```

## Best Practices for OpenMCT + Jasmine + Karma Testing

### 1. Proper OpenMCT Setup and Cleanup
```javascript
beforeEach((done) => {
  openmct = createOpenMct();
  openmct.on('start', done);
  openmct.startHeadless();
});

afterEach(() => {
  return resetApplicationState();
});
```

### 2. Use Jasmine's Done Callback Properly
```javascript
// GOOD: Use done callback for async operations
it('async operation', (done) => {
  someAsyncOperation().then(result => {
    expect(result).toBeDefined();
    done();
  }).catch(done);
});
```

### 3. Mock OpenMCT Dependencies
```javascript
// Mock telemetry providers
const mockTelemetryProvider = {
  request: jasmine.createSpy('request').and.returnValue(Promise.resolve([])),
  subscribe: jasmine.createSpy('subscribe'),
  unsubscribe: jasmine.createSpy('unsubscribe')
};
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- src/flaky-tests/FlakyTestsSpec.js
```

### Run with Coverage
```bash
npm run test:coverage
```

## Resources

- [Jasmine Documentation](https://jasmine.github.io/)
- [Karma Documentation](https://karma-runner.github.io/)
- [OpenMCT Testing Guide](https://github.com/nasa/openmct/blob/master/TESTING.md)
