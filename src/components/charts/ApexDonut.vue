<template>
  <apexchart type="donut" height="240" :options="opts" :series="series" />
</template>

<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
const apexchart = VueApexCharts

const props = withDefaults(defineProps<{ labels?: string[]; series?: number[] }>(), {
  labels: () => ['OK', 'Warning', 'Error'],
  series: () => [68, 24, 8],
})

const opts = {
  labels: props.labels,
  dataLabels: { enabled: false },
  legend: { position: 'bottom', labels: { colors: '#d0d6e0' } },
  colors: ['#4cb782', '#f2c94c', '#eb5757'],
  theme: { mode: 'dark' },
}

const series = props.series
</script>


