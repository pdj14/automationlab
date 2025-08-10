<template>
  <div class="s-tabs">
    <div class="s-tabs__list" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="s-tab"
        :class="{ active: tab.value === modelValue }"
        role="tab"
        :aria-selected="tab.value === modelValue"
        @click="$emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="s-tabs__panel">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  tabs: Array<{ label: string; value: string }>
}>()
defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<style scoped>
.s-tabs__list {
  display: flex;
  gap: .25rem;
  border-bottom: 1px solid var(--color-border-primary, #23252a);
}
.s-tab {
  background: transparent;
  color: var(--color-text-secondary, #d0d6e0);
  border: 0;
  padding: .5rem .75rem;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.s-tab.active {
  color: var(--color-text-primary, #f7f8f8);
  border-color: var(--color-accent, #7170ff);
}
.s-tabs__panel { padding-top: 1rem; }
</style>



