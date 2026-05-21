# Performance Metrics

Picro can collect performance metrics when enabled.

## Enabling

Set `enablePerformanceTracking: true` when creating an AgentSession:

```ts
const session = new AgentSession({
  // ... other config
  enablePerformanceTracking: true,
});
```

## Viewing Metrics

### Via Slash Command
Press `/` and type `stats` to view performance metrics in the TUI.

### Via API
```ts
const stats = session.getPerformanceStats();
if (stats) {
  console.log('Sample count:', stats.sampleCount);
  console.log('Avg CPU (ms):', stats.avgCpuUserMS);
  console.log('Peak RSS (MB):', stats.peakRSSMB);
}
```

## Metrics Explained

| Field | Description |
|-------|-------------|
| `sampleCount` | Number of samples collected |
| `timeSpanMS` | Time span in ms between first and last sample |
| `avgCpuUserMS` | Average CPU user time per sample (ms) |
| `avgCpuSystemMS` | Average CPU system time per sample (ms) |
| `avgRSSMB` | Average resident set size (MB) |
| `avgHeapUsedMB` | Average heap used (MB) |
| `peakRSSMB` | Peak resident set size (MB) |
| `peakHeapUsedMB` | Peak heap used (MB) |

## Notes

- Performance tracking adds minimal overhead (samples every 5 seconds by default).
- Disable in production if not needed to save memory.
- Metrics are stored in memory and cleared on session destroy.
