// Performance Tracker Example
//
// Shows how to monitor CPU and memory usage over time.

import { PerformanceTracker } from '@picro/agent';

// Create tracker with 10-second interval and max 100 samples
const tracker = new PerformanceTracker({ interval: 10000, maxSamples: 100 });

// Start collecting
tracker.start();

// Simulate work
setTimeout(() => {
  // After some time, stop and print stats
  tracker.stop();
  const stats = tracker.getStats();
  if (stats) {
    console.log('Performance Summary:');
    console.log(`  Samples: ${stats.sampleCount}`);
    console.log(`  Time span: ${stats.timeSpanMS} ms`);
    console.log(`  Avg CPU (user): ${stats.avgCpuUserMS.toFixed(2)} ms`);
    console.log(`  Avg CPU (system): ${stats.avgCpuSystemMS.toFixed(2)} ms`);
    console.log(`  Avg RSS: ${stats.avgRSSMB.toFixed(2)} MB`);
    console.log(`  Peak RSS: ${stats.peakRSSMB.toFixed(2)} MB`);
  }
  tracker.destroy();
}, 35000);
