<template>
  <span class="s-badge" :class="[`s-badge--${tone}`]"><slot /></span>
</template>

<script setup lang="ts">
defineProps<{ tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }>()
</script>

<style scoped>
.s-badge {
  display: inline-block;
  border-radius: var(--radius-rounded, 9999px);
  padding: 0.2rem 0.5rem;
  font-size: var(--font-size-mini, .75rem);
  border: 1px solid var(--color-border-secondary, #34343a);
  background: var(--color-bg-translucent, rgba(255,255,255,0.05));
  color: var(--color-text-secondary, #d0d6e0);
}
.s-badge--info { color: #4ea7fc; border-color: #3e3e44; }
.s-badge--success { color: #4cb782; border-color: #3e3e44; }
.s-badge--warning { color: #f2c94c; border-color: #3e3e44; }
.s-badge--danger { color: #eb5757; border-color: #3e3e44; }
</style>


