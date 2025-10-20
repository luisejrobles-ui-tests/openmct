/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2023, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

import { createOpenMct, resetApplicationState } from 'utils/testing';

describe('Flaky Tests for OpenMCT', () => {
  let openmct;

  beforeEach((done) => {
    openmct = createOpenMct();
    openmct.on('start', done);
    openmct.startHeadless();
  });

  afterEach(() => {
    return resetApplicationState();
  });

  // FLAKY TEST 1: Race condition with async initialization
  it('should initialize components with proper timing (FLAKY: race condition)', (done) => {
    let initializationComplete = false;
    let componentCheckComplete = false;
    
    // Mock async initialization with random delay
    const mockAsyncInit = () => {
      return new Promise((resolve) => {
        const delay = Math.random() * 150 + 50; // 50-200ms random delay
        setTimeout(() => {
          initializationComplete = true;
          resolve();
        }, delay);
      });
    };

    // Start initialization
    mockAsyncInit().then(() => {
      // Check components immediately after promise resolves
      // This will be flaky because the component might not be fully ready
      setTimeout(() => {
        componentCheckComplete = true;
        expect(openmct.components).toBeDefined();
        expect(openmct.components.ObjectView).toBeDefined();
        done();
      }, 10); // Very short delay - often not enough
    });

    // This assertion will fail ~60% of the time due to timing issues
    setTimeout(() => {
      expect(initializationComplete).toBe(true);
      expect(componentCheckComplete).toBe(true);
    }, 100); // Fixed timing check
  });

  // FLAKY TEST 2: Event timing with multiple listeners
  it('should handle multiple event listeners correctly (FLAKY: event timing)', (done) => {
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
          }, Math.random() * 100 + 20); // 20-120ms random delay
        });
      }
    };

    // Add multiple listeners
    mockEventEmitter.on('test-event', () => {});
    mockEventEmitter.on('test-event', () => {});
    mockEventEmitter.on('test-event', () => {});

    // Emit event
    mockEventEmitter.emit('test-event', { test: 'data' });

    // Check results too early - events might not have fired yet
    setTimeout(() => {
      expect(eventCount).toBe(3); // FLAKY: will often be 0 or less than 3
      expect(lastEventTime).toBeGreaterThan(0); // FLAKY: will often be 0
      done();
    }, 50); // Check at 50ms - often before all events complete
  });

  // FLAKY TEST 3: Promise resolution with overlapping operations
  it('should handle overlapping async operations (FLAKY: promise timing)', async () => {
    const results = [];
    const startTime = Date.now();
    
    // Create overlapping async operations with random delays
    const asyncOp1 = () => new Promise(resolve => {
      setTimeout(() => {
        results.push({ op: 'first', time: Date.now() - startTime });
        resolve('first');
      }, Math.random() * 100 + 50); // 50-150ms
    });
    
    const asyncOp2 = () => new Promise(resolve => {
      setTimeout(() => {
        results.push({ op: 'second', time: Date.now() - startTime });
        resolve('second');
      }, Math.random() * 120 + 40); // 40-160ms
    });
    
    const asyncOp3 = () => new Promise(resolve => {
      setTimeout(() => {
        results.push({ op: 'third', time: Date.now() - startTime });
        resolve('third');
      }, Math.random() * 80 + 30); // 30-110ms
    });

    // Start all operations
    const promises = [asyncOp1(), asyncOp2(), asyncOp3()];
    
    // Wait for completion
    await Promise.all(promises);
    
    // These assertions assume specific timing, but with random delays, they're often wrong
    expect(results).toHaveLength(3);
    expect(results[0].op).toBe('third'); // FLAKY: ~67% chance of being wrong
    expect(results[1].op).toBe('first'); // FLAKY: ~67% chance of being wrong
    expect(results[2].op).toBe('second'); // FLAKY: ~67% chance of being wrong
  });

  // FLAKY TEST 4: DOM manipulation timing
  it('should handle DOM updates with proper timing (FLAKY: DOM timing)', (done) => {
    // Create mock DOM element
    const mockElement = {
      style: {},
      innerHTML: '',
      classList: {
        add: jasmine.createSpy('add'),
        remove: jasmine.createSpy('remove')
      }
    };

    let domUpdateComplete = false;
    
    // Mock DOM update with variable timing
    const mockDOMUpdate = () => {
      return new Promise((resolve) => {
        const delay = Math.random() * 200 + 100; // 100-300ms
        setTimeout(() => {
          mockElement.style.display = 'block';
          mockElement.innerHTML = 'Updated content';
          mockElement.classList.add('updated');
          domUpdateComplete = true;
          resolve();
        }, delay);
      });
    };

    // Start DOM update
    mockDOMUpdate();

    // Check DOM state too early - update might not be complete
    setTimeout(() => {
      expect(mockElement.style.display).toBe('block'); // FLAKY: will often be undefined
      expect(mockElement.innerHTML).toBe('Updated content'); // FLAKY: will often be empty
      expect(mockElement.classList.add).toHaveBeenCalledWith('updated'); // FLAKY: will often not be called
      expect(domUpdateComplete).toBe(true); // FLAKY: will often be false
      done();
    }, 150); // Check at 150ms - often before 100-300ms delay completes
  });

  // FLAKY TEST 5: Memory/GC timing issues
  it('should handle memory operations correctly (FLAKY: GC timing)', (done) => {
    let objectsCreated = 0;
    let objectsDestroyed = 0;
    
    // Mock object lifecycle with timing issues
    const createObject = () => {
      const obj = {
        id: Math.random(),
        data: new Array(1000).fill('test data')
      };
      objectsCreated++;
      
      // Simulate async cleanup with random timing
      setTimeout(() => {
        obj.data = null;
        objectsDestroyed++;
      }, Math.random() * 150 + 50); // 50-200ms
      
      return obj;
    };

    // Create multiple objects
    const objects = [];
    for (let i = 0; i < 5; i++) {
      objects.push(createObject());
    }

    // Check cleanup too early - cleanup might not be complete
    setTimeout(() => {
      expect(objectsCreated).toBe(5);
      expect(objectsDestroyed).toBe(5); // FLAKY: will often be less than 5
      done();
    }, 100); // Check at 100ms - often before cleanup completes
  });
});
