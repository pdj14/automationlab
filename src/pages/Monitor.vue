<template>
  <div class="monitor">
    <div class="stage">
      <figure class="media">
        <img src="/example.jpg" alt="Live Lab Overview" />
      </figure>

      <transition name="fade">
        <div v-show="anyPanelOpen" class="overlay" @click="closePanels" />
      </transition>

      <transition name="slide-left">
        <aside v-show="leftPanelOpen" class="panel panel--left translucent" role="dialog" aria-modal="true">
          <header class="panel__header">
            <h3>{{ leftPanelTitle }}</h3>
            <button class="icon" @click="closeLeft">✕</button>
          </header>
          <div class="panel__body">
            <component :is="leftComponent" :key="leftKey" />
          </div>
        </aside>
      </transition>

      <transition name="slide-right">
        <aside v-show="rightPanelOpen" class="panel panel--right translucent" role="dialog" aria-modal="true">
          <header class="panel__header">
            <h3>{{ rightPanelTitle }}</h3>
            <button class="icon" @click="closeRight">✕</button>
          </header>
          <div class="panel__body">
            <component :is="rightComponent" :key="rightKey" />
          </div>
        </aside>
      </transition>
    </div>

    <div class="toolbar">
      <SButton size="lg" variant="secondary" @click="toggleStatus">Status</SButton>
      <SButton size="lg" variant="secondary" @click="toggleLeft('devices')">Devices</SButton>
      <SButton size="lg" variant="secondary" @click="toggleRight('environment')">Environment</SButton>
      <SButton size="lg" variant="secondary" @click="toggleRight('power')">Power</SButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { SButton } from '@/ui'
import StatusPanel from '@/pages/panels/StatusPanel.vue'

type LeftKinds = 'status' | 'devices'
type RightKinds = 'environment' | 'power' | 'status'

const left = ref<LeftKinds | null>(null)
const right = ref<RightKinds | null>(null)

const leftPanelOpen = computed(() => left.value !== null)
const rightPanelOpen = computed(() => right.value !== null)
const anyPanelOpen = computed(() => leftPanelOpen.value || rightPanelOpen.value)

function toggleLeft(kind: LeftKinds) {
  left.value = left.value === kind ? null : kind
}
function toggleRight(kind: RightKinds) {
  right.value = right.value === kind ? null : kind
}
function toggleStatus() {
  // Status는 좌/우 모두 동일하게 표시
  const open = !(left.value === 'status' && right.value === 'status')
  if (open) {
    left.value = 'status'
    right.value = 'status'
  } else {
    left.value = null
    right.value = null
  }
}
function closeLeft() { left.value = null }
function closeRight() { right.value = null }
function closePanels() { left.value = null; right.value = null }

const leftPanelTitle = computed(() => left.value === 'status' ? 'Status' : left.value === 'devices' ? 'Devices' : '')
const rightPanelTitle = computed(() => right.value === 'status' ? 'Status' : right.value === 'environment' ? 'Environment' : right.value === 'power' ? 'Power' : '')

// Minimal demo components; replace with real dashboards later
const Status = StatusPanel
const Devices = {
  template: `<div class='stack'>
    <div class='row'><span>Robots</span><strong>12</strong></div>
    <div class='row'><span>Stations</span><strong>8</strong></div>
    <div class='row'><span>Sensors</span><strong>184</strong></div>
  </div>`
}
const Environment = {
  template: `<div class='stack'>
    <div class='row'><span>Temp</span><strong>21°C</strong></div>
    <div class='row'><span>Humidity</span><strong>45%</strong></div>
    <div class='row'><span>Airflow</span><strong>3.8 m/s</strong></div>
  </div>`
}
const Power = {
  template: `<div class='stack'>
    <div class='row'><span>Load</span><strong>36%</strong></div>
    <div class='row'><span>UPS</span><strong>OK</strong></div>
    <div class='row'><span>Capacity</span><strong>1.6 MVA</strong></div>
  </div>`
}

const leftComponent = computed(() => left.value === 'status' ? Status : left.value === 'devices' ? Devices : null)
const rightComponent = computed(() => right.value === 'status' ? Status : right.value === 'environment' ? Environment : right.value === 'power' ? Power : null)
const leftKey = computed(() => String(left.value))
const rightKey = computed(() => String(right.value))

function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') closePanels() }
onMounted(() => window.addEventListener('keydown', onEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))
</script>

<style scoped>
.monitor { 
  display: grid; 
  grid-template-rows: 1fr auto; 
  gap: 0.5rem; 
  padding: 0 var(--page-padding-inline, 24px); 
  height: calc(100vh - var(--header-height, 64px)); 
  overflow: hidden; 
}
.stage { position: relative; border: 1px solid var(--color-border-primary, #23252a); border-radius: var(--radius-12, 12px); overflow: hidden; background: var(--color-bg-level-1, #0f1011); min-height: 0; }
.media { margin: 0; height: 100%; background: var(--color-bg-level-1, #0f1011); }
.media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.toolbar { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }

.overlay { position: absolute; inset: 0; background: rgba(0,0,0,.35); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.panel { position: absolute; top: 0; bottom: 0; width: min(380px, 90%); background: var(--color-bg-level-2, #141516); border: 1px solid var(--color-border-primary, #23252a); z-index: 2; display: grid; grid-template-rows: auto 1fr; }
.panel.translucent { background: color-mix(in srgb, var(--color-bg-level-2, #141516) 75%, transparent); backdrop-filter: blur(6px); }
.panel--left { left: 0; border-right: 0; }
.panel--right { right: 0; border-left: 0; }
.panel__header { display:flex; align-items:center; justify-content: space-between; padding: .75rem 1rem; border-bottom: 1px solid var(--color-border-secondary, #34343a); }
.panel__header h3 { margin: 0; }
.panel__body { padding: 1rem; overflow: auto; }
.icon { background: transparent; border: 0; color: var(--color-text-secondary, #d0d6e0); cursor: pointer; }

.slide-left-enter-active, .slide-left-leave-active { transition: transform .25s ease, opacity .25s ease; }
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(-12px); opacity: 0; }
.slide-right-enter-active, .slide-right-leave-active { transition: transform .25s ease, opacity .25s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(12px); opacity: 0; }

.stack { display: grid; gap: .5rem; }
.row { display:flex; align-items:center; justify-content: space-between; padding: .5rem .75rem; border: 1px solid var(--color-border-secondary, #34343a); border-radius: var(--radius-6, 6px); background: var(--color-bg-level-1, #0f1011); }

/* Charts */
.card { border: 1px solid var(--color-border-secondary, #34343a); border-radius: var(--radius-8, 8px); padding: .75rem; background: var(--color-bg-level-1, #0f1011); }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .75rem; }
.charts .chart:last-child { grid-column: span 2; }
.pie { width: 100%; height: auto; }
.pie-bg { fill: none; stroke: var(--color-border-secondary, #34343a); stroke-width: 12; }
.pie-seg { fill: none; stroke-width: 12; stroke-linecap: butt; transform: rotate(-90deg); transform-origin: 60px 60px; }
.pie-seg.ok { stroke: #4cb782; }
.pie-seg.warn { stroke: #f2c94c; }
.pie-seg.err { stroke: #eb5757; }
.legend { display:flex; gap:.75rem; align-items:center; margin-top: .5rem; color: var(--color-text-secondary); }
.legend .dot { width:10px; height:10px; border-radius:50%; display:inline-block; }
.legend .dot.ok { background:#4cb782; }
.legend .dot.warn { background:#f2c94c; }
.legend .dot.err { background:#eb5757; }
.bars { display:grid; gap:.5rem; }
.bar { display:grid; grid-template-columns: 1fr auto; align-items:center; gap:.5rem; }
.bar i { display:block; width: min(220px, 40vw); height: 8px; border-radius: 9999px; background: var(--color-bg-tertiary, #232326); position: relative; }
.bar i::after { content:""; position:absolute; inset:0; width: var(--v); background: var(--color-accent, #7170ff); border-radius: 9999px; }
.line { width: 100%; height: auto; }
.line polyline { fill: none; stroke: var(--color-accent, #7170ff); stroke-width: 2; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: .5rem; border-top: 1px solid var(--color-border-secondary, #34343a); text-align: left; }
.table thead th { color: var(--color-text-secondary); font-weight: 590; }
</style>


