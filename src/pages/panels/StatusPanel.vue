<template>
  <div class="stack">
    <div class="charts">
      <div class="chart card">
        <h4>Health Distribution</h4>
        <ApexDonut />
      </div>
      <div class="chart card">
        <h4>Events by Type</h4>
        <ApexBar />
      </div>
      <div class="chart card">
        <h4>Latency (ms)</h4>
        <ApexLine />
      </div>
    </div>
    <div class="card">
      <h4>Recent Status</h4>
      <table class="table">
        <thead>
          <tr><th>Time</th><th>Component</th><th>Status</th><th>Note</th></tr>
        </thead>
        <tbody>
          <tr><td>10:14</td><td>Robot-7</td><td>OK</td><td>Cycle complete</td></tr>
          <tr><td>10:12</td><td>Station-A</td><td>Warning</td><td>Queue length &gt; 10</td></tr>
          <tr><td>10:10</td><td>Sensor-12</td><td>Error</td><td>No signal</td></tr>
          <tr><td>10:08</td><td>AGV-2</td><td>OK</td><td>Idle</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import ApexDonut from '@/components/charts/ApexDonut.vue'
import ApexBar from '@/components/charts/ApexBar.vue'
import ApexLine from '@/components/charts/ApexLine.vue'
</script>

<style scoped>
.card { border: 1px solid var(--color-border-secondary, #34343a); border-radius: var(--radius-8, 8px); padding: .75rem; background: var(--color-bg-level-1, #0f1011); }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .75rem; }
.charts .chart:last-child { grid-column: span 2; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: .5rem; border-top: 1px solid var(--color-border-secondary, #34343a); text-align: left; }
.table thead th { color: var(--color-text-secondary); font-weight: 590; }
</style>


