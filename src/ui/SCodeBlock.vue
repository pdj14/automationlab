<template>
  <pre class="s-code"><code><slot /></code></pre>
</template>

<script setup lang="ts">
// minimal code block; integrate a highlighter later if needed
</script>

<style scoped>
.s-code {
  background: #0b0c0d;
  color: #e5e7eb;
  border: 1px solid var(--color-border-primary, #23252a);
  border-radius: var(--radius-8, 8px);
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font-family: var(--font-monospace, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.875rem;
}
</style>



