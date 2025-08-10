<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="s-spark">
    <polyline :points="pointsAttr" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ values?: number[]; width?: number; height?: number }>(), {
  width: 240,
  height: 80,
})

const defaultVals = [60, 40, 45, 30, 35, 28, 32, 26, 30, 20, 24, 18, 22]
const vals = computed(() => (props.values && props.values.length ? props.values : defaultVals))
const min = computed(() => Math.min(...vals.value))
const max = computed(() => Math.max(...vals.value))
const norm = (v: number) => {
  const range = max.value - min.value || 1
  return props.height - ((v - min.value) / range) * props.height
}
const pointsAttr = computed(() => vals.value.map((v, i) => `${(i / (vals.value.length - 1)) * props.width},${norm(v)}`).join(' '))
</script>

<style scoped>
.s-spark { width: 100%; height: auto; }
.s-spark polyline { fill: none; stroke: var(--color-accent, #7170ff); stroke-width: 2; }
</style>


