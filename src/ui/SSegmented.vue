<template>
  <div class="s-segmented" role="tablist" aria-label="Segmented control">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="seg"
      :class="{ active: opt.value === modelValue }"
      role="tab"
      :aria-selected="opt.value === modelValue"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: Array<{ label: string; value: string }>
}>()
defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<style scoped>
.s-segmented {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--radius-rounded, 9999px);
  border: 1px solid var(--color-border-secondary, #34343a);
  background: var(--color-bg-tertiary, #232326);
  gap: 4px;
}
.seg {
  border: 0;
  padding: 0.375rem 0.75rem;
  border-radius: var(--radius-rounded, 9999px);
  background: transparent;
  color: var(--color-text-secondary, #d0d6e0);
  cursor: pointer;
}
.seg.active {
  background: var(--color-bg-level-1, #0f1011);
  color: var(--color-text-primary, #f7f8f8);
  box-shadow: inset 0 0 0 1px var(--color-border-tertiary, #3e3e44);
}
.seg:hover { color: var(--color-text-primary, #f7f8f8); }
</style>



