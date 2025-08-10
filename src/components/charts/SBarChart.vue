<template>
  <div class="s-bars">
    <div v-for="(d, i) in data" :key="i" class="bar">
      <span class="label">{{ d.label }}</span>
      <div class="track"><i class="fill" :style="{ width: pct(d.value) }" /></div>
      <span class="val">{{ d.value }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ data: Array<{ label: string; value: number }>; max?: number }>(), {
  data: () => ([
    { label: 'A', value: 40 },
    { label: 'B', value: 25 },
    { label: 'C', value: 15 },
  ])
})
const pct = (v: number) => `${Math.min(100, Math.round((v / (props.max ?? 100)) * 100))}%`
</script>

<style scoped>
.s-bars { display:grid; gap:.5rem; }
.bar { display:grid; grid-template-columns: 1fr minmax(160px, 30vw) auto; gap:.5rem; align-items:center; }
.track { height: 8px; background: var(--color-bg-tertiary, #232326); border-radius: 9999px; position: relative; overflow: hidden; }
.fill { display:block; height: 100%; background: var(--color-accent, #7170ff); }
.label { color: var(--color-text-secondary); }
.val { color: var(--color-text-secondary); min-width: 3ch; text-align: right; }
</style>


