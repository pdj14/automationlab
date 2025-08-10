<template>
  <apexchart type="line" height="240" :options="opts" :series="series" />
</template>

<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
const apexchart = VueApexCharts

const props = withDefaults(defineProps<{ values?: number[]; categories?: string[] }>(), {
  values: () => [60, 40, 45, 30, 35, 28, 32, 26, 30, 20, 24, 18, 22],
  categories: () => Array.from({ length: 13 }, (_, i) => `${i}`),
})

const series = [{ name: 'Latency', data: props.values }]
const opts = {
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  xaxis: { categories: props.categories, labels: { style: { colors: '#8a8f98' } } },
  yaxis: { labels: { style: { colors: '#8a8f98' } } },
  dataLabels: { enabled: false },
  stroke: { width: 2, curve: 'smooth' },
  colors: ['#7170ff'],
  theme: { mode: 'dark' },
}
</script>


