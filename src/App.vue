<template>
  <div id="app">
    <nav class="topbar">
      <RouterLink to="/" class="brand">
        <span class="dot" />
        <span>SDF</span>
      </RouterLink>
      <div class="nav-actions">
        <RouterLink to="/components" class="btn btn-secondary">Components</RouterLink>
        <RouterLink to="/monitor" class="btn btn-secondary">Monitor</RouterLink>
        <button class="btn btn-secondary" @click="toggleTheme()">{{ themeLabel }}</button>
        <button class="btn btn-primary" @click="toggleDesigner()">{{ isDesigner ? 'Go Home' : 'Open Designer' }}</button>
      </div>
    </nav>
    <router-view />
  </div>
  
</template>

<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { computed, ref, onMounted } from 'vue'
import { initTheme, applyTheme, type ThemeMode } from './theme/themeManager'

const route = useRoute()
const router = useRouter()
const isDesigner = computed(() => route.name === 'designer')

function toggleDesigner() {
  if (isDesigner.value) {
    router.push({ name: 'home' })
  } else {
    router.push({ name: 'designer' })
  }
}

const theme = ref<ThemeMode>('dark')
const themeLabel = computed(() => theme.value === 'dark' ? 'Light mode' : 'Dark mode')
onMounted(() => { theme.value = initTheme() })
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  applyTheme(theme.value)
}
</script>

<style scoped>
#app { min-height: 100vh; display: flex; flex-direction: column; }
.topbar {
  position: sticky; top: 0; z-index: var(--layer-header, 100);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem var(--page-padding-inline, 24px);
  backdrop-filter: blur(var(--header-blur, 20px));
  background: var(--header-bg, hsla(0,0%,4%,.8));
  border-bottom: 1px solid var(--header-border, hsla(0,0%,100%,.08));
}
.brand { display:flex; align-items:center; gap: .5rem; text-decoration:none; color: var(--color-text-primary, #f7f8f8); font-weight: 590; }
.brand .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-accent, #7170ff); display:inline-block; }
.btn { padding: 0.5rem 0.75rem; border-radius: var(--radius-6, 6px); text-decoration:none; border: 1px solid transparent; }
.btn-primary { background: var(--color-accent, #7170ff); color: var(--color-brand-text, #fff); }
.btn-primary:hover { background: var(--color-accent-hover, #828fff); }
.btn-secondary { background: var(--color-bg-tertiary, #232326); color: var(--color-text-primary, #f7f8f8); border-color: var(--color-border-secondary, #34343a); }
.btn-secondary:hover { background: var(--color-bg-quaternary, #28282c); }
</style>