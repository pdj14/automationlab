<template>
  <button
    :class="[
      's-btn',
      `s-btn--${variant}`,
      `s-btn--${size}`,
      { 'is-loading': loading }
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}>()

defineEmits<{ (e: 'click', ev: MouseEvent): void }>()
</script>

<style scoped>
.s-btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: var(--radius-6, 6px);
  padding: 0.5rem 0.875rem;
  font: var(--text-regular, 0.9375rem/1.6 var(--font-regular, 'Inter Variable'));
  color: var(--color-brand-text, #fff);
  background: var(--color-accent, #7170ff);
  transition: background var(--speed-regularTransition, .25s) ease, border-color .2s ease, box-shadow .2s ease;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.s-btn:hover { background: var(--color-accent-hover, #828fff); }
.s-btn:disabled { opacity: .6; cursor: not-allowed; }

.s-btn--secondary {
  background: var(--color-bg-tertiary, #232326);
  color: var(--color-text-primary, #f7f8f8);
  border-color: var(--color-border-secondary, #34343a);
}
.s-btn--secondary:hover { background: var(--color-bg-quaternary, #28282c); }

.s-btn--ghost {
  background: transparent;
  color: var(--color-text-secondary, #d0d6e0);
  border-color: var(--color-border-secondary, #34343a);
}
.s-btn--ghost:hover { color: var(--color-text-primary, #f7f8f8); border-color: var(--color-border-tertiary, #3e3e44); }

.s-btn--sm { padding: 0.375rem 0.65rem; font-size: var(--font-size-small, .8125rem); }
.s-btn--md { padding: 0.5rem 0.875rem; }
.s-btn--lg { padding: 0.625rem 1.1rem; font-size: var(--font-size-large, 1.125rem); }

.spinner {
  width: 1em; height: 1em; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.35);
  border-top-color: currentColor;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>


