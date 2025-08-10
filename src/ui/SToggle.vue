<template>
  <button class="s-toggle" :class="{ 'is-on': modelValue }" @click="$emit('update:modelValue', !modelValue)">
    <span class="handle" />
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()
</script>

<style scoped>
.s-toggle {
  width: 40px; height: 24px; border-radius: 9999px;
  border: 1px solid var(--color-border-secondary, #34343a);
  background: var(--color-bg-tertiary, #232326);
  position: relative;
  cursor: pointer;
}
.s-toggle .handle {
  position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
  background: var(--color-bg-level-1, #0f1011);
  border-radius: 50%; transition: transform .2s ease;
}
.s-toggle.is-on { background: var(--color-accent, #7170ff); border-color: transparent; }
.s-toggle.is-on .handle { transform: translateX(16px); background: var(--color-brand-text, #fff); }
</style>


