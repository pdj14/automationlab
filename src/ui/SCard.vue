<template>
  <section class="s-card" :class="[`s-card--${elevation}`]">
    <header v-if="$slots.header" class="s-card__header">
      <slot name="header" />
    </header>
    <div class="s-card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="s-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
defineProps<{ elevation?: 'none' | 'low' | 'medium' }>()
</script>

<style scoped>
.s-card {
  border: 1px solid var(--color-border-primary, #23252a);
  background: var(--color-bg-level-1, #0f1011);
  border-radius: var(--radius-12, 12px);
  overflow: hidden;
}
.s-card--low { box-shadow: var(--shadow-low, 0px 2px 4px rgba(0,0,0,.1)); }
.s-card--medium { box-shadow: var(--shadow-medium, 0px 4px 24px rgba(0,0,0,.2)); }
.s-card__header, .s-card__footer { padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border-secondary, #34343a); }
.s-card__footer { border-top: 1px solid var(--color-border-secondary, #34343a); border-bottom: 0; }
.s-card__body { padding: 1rem; }
</style>


