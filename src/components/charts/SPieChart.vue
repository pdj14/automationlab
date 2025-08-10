<template>
  <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" class="s-pie">
    <circle :cx="c" :cy="c" :r="r" class="bg" :stroke-width="strokeWidth" />
    <g v-for="(seg, i) in segments" :key="i">
      <circle
        :cx="c" :cy="c" :r="r"
        class="seg"
        :style="{
          stroke: seg.color,
          strokeDasharray: `${seg.len} ${circumference}`,
          strokeDashoffset: `-${seg.offset}`
        }"
        :stroke-width="strokeWidth"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface PieDatum { label: string; value: number; color: string }

const props = withDefaults(defineProps<{
  data?: PieDatum[]
  size?: number
  strokeWidth?: number
}>(), {
  size: 120,
  strokeWidth: 12,
})

const c = computed(() => props.size / 2)
const r = computed(() => props.size / 2 - props.strokeWidth)
const circumference = computed(() => 2 * Math.PI * r.value)
const defaultData: PieDatum[] = [
  { label: 'OK', value: 68, color: '#4cb782' },
  { label: 'Warning', value: 24, color: '#f2c94c' },
  { label: 'Error', value: 8, color: '#eb5757' },
]
const data = computed(() => props.data && props.data.length ? props.data : defaultData)
const total = computed(() => data.value.reduce((s, d) => s + d.value, 0) || 1)

const segments = computed(() => {
  let acc = 0
  return data.value.map(d => {
    const len = (d.value / total.value) * circumference.value
    const seg = { len, offset: acc, color: d.color }
    acc += len
    return seg
  })
})
</script>

<style scoped>
.s-pie { display:block; }
.bg { fill: none; stroke: var(--color-border-secondary, #34343a); stroke-width: v-bind(strokeWidth); }
.seg { fill: none; stroke-width: v-bind(strokeWidth); transform: rotate(-90deg); transform-origin: center; }
</style>


