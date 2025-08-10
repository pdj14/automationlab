<template>
  <apexchart type="bar" height="260" :options="opts" :series="series" />
</template>

<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
const apexchart = VueApexCharts

const props = withDefaults(defineProps<{ categories?: string[]; values?: number[] }>(), {
  categories: () => ['Connectivity', 'Throughput', 'Safety', 'Quality'],
  values: () => [72, 55, 30, 44],
})

const series = [{ name: 'Events', data: props.values }]
const opts = {
  chart: { toolbar: { show: false } },
  xaxis: { categories: props.categories, labels: { style: { colors: '#d0d6e0' } } },
  yaxis: { labels: { style: { colors: '#8a8f98' } } },
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
  colors: ['#7170ff'],
  theme: { mode: 'dark' },
}
</script>


