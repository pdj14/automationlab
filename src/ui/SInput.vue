<template>
  <label class="s-input">
    <span v-if="label" class="s-input__label">{{ label }}</span>
    <input
      :type="type"
      :placeholder="placeholder"
      :value="modelValue"
      :disabled="disabled"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  type?: 'text' | 'email' | 'password'
  disabled?: boolean
}>()
defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<style scoped>
.s-input { display: grid; gap: 0.375rem; }
.s-input__label { color: var(--color-text-secondary, #d0d6e0); font-size: var(--font-size-small, .8125rem); }
.s-input input {
  background: var(--color-bg-level-1, #0f1011);
  color: var(--color-text-primary, #f7f8f8);
  border: 1px solid var(--color-border-secondary, #34343a);
  border-radius: var(--radius-6, 6px);
  padding: 0.5rem 0.75rem;
}
.s-input input:focus { outline: var(--focus-ring-outline, 2px solid #5e6ad2); outline-offset: var(--focus-ring-offset, 2px); }
.s-input input:disabled { opacity: .6; }
</style>


