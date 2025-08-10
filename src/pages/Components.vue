<template>
  <div class="components-page">
    <header class="page-header">
      <h2>Components</h2>
      <p class="lead">Reusable UI kit for SDF based on Linear theme tokens.</p>
    </header>

    <section class="section">
      <h3>Buttons</h3>
      <div class="row">
        <SButton>Primary</SButton>
        <SButton variant="secondary">Secondary</SButton>
        <SButton variant="ghost">Ghost</SButton>
        <SButton size="sm">Small</SButton>
        <SButton size="lg">Large</SButton>
        <SButton :loading="true">Loading</SButton>
      </div>
    </section>

    <section class="section">
      <h3>Badges</h3>
      <div class="row">
        <SBadge>Neutral</SBadge>
        <SBadge tone="info">Info</SBadge>
        <SBadge tone="success">Success</SBadge>
        <SBadge tone="warning">Warning</SBadge>
        <SBadge tone="danger">Danger</SBadge>
      </div>
    </section>

    <section class="section">
      <h3>Inputs</h3>
      <SCard elevation="low">
        <template #header>Form controls</template>
        <div class="grid">
          <SInput v-model="email" label="Email" placeholder="you@example.com" type="email" />
          <SInput v-model="password" label="Password" type="password" />
          <div class="toggle-field">
            <label>Enable autosave</label>
            <SToggle v-model="autosave" />
          </div>
        </div>
        <template #footer>
          <div class="footer-actions">
            <SButton variant="secondary">Cancel</SButton>
            <SButton>Save</SButton>
          </div>
        </template>
      </SCard>
    </section>

  <section class="section">
    <h3>Segmented</h3>
    <SSegmented v-model="billing" :options="[
      { label: 'Yearly', value: 'yearly' },
      { label: 'Monthly', value: 'monthly' }
    ]" />
  </section>

  <section class="section">
    <h3>Pricing</h3>
    <SPricingTable :plans="plans" />
  </section>

  <section class="section">
    <h3>Tabs & Docs</h3>
    <STabs v-model="docsTab" :tabs="[
      { label: 'GraphQL API', value: 'api' },
      { label: 'Authentication', value: 'auth' },
      { label: 'Agents', value: 'agents' }
    ]" />
    <div v-if="docsTab === 'api'">
      <SDocCard>
        <template #title>GraphQL API</template>
        <template #badge>Getting started</template>
        <SCodeBlock>{`query { viewer { name } }`}</SCodeBlock>
      </SDocCard>
    </div>
    <div v-else-if="docsTab === 'auth'">
      <SDocCard>
        <template #title>Authentication</template>
        <template #badge>OAuth 2.0</template>
        <p>Use OAuth 2.0 or personal API keys to authenticate your requests.</p>
      </SDocCard>
    </div>
    <div v-else>
      <SDocCard>
        <template #title>Agents</template>
        <template #badge>Guidelines</template>
        <p>Integrate an AI agent following recommended interaction practices.</p>
      </SDocCard>
    </div>
  </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SButton, SCard, SBadge, SInput, SToggle, SSegmented, SPricingTable, STabs, SDocCard, SCodeBlock } from '@/ui'

const email = ref('')
const password = ref('')
const autosave = ref(true)
const billing = ref<'yearly' | 'monthly'>('yearly')
const docsTab = ref<'api' | 'auth' | 'agents'>('api')

const plans = ref([
  {
    title: 'Free',
    price: '$0',
    period: '',
    cta: 'Get started',
    features: [
      'Unlimited members',
      '2 teams',
      '250 issues',
      'Slack and GitHub',
      'API access',
    ],
  },
  {
    title: 'Basic',
    price: '$8',
    period: 'per user/month',
    cta: 'Get started',
    features: [
      'All Free features +',
      '5 teams',
      'Unlimited issues',
      'Unlimited file uploads',
      'Admin roles',
    ],
  },
  {
    title: 'Business',
    price: '$14',
    period: 'per user/month',
    cta: 'Get started',
    primary: true,
    features: [
      'All Basic features +',
      'Linear Asks',
      'Unlimited teams',
      'Private teams and guests',
      'Linear Insights',
      'Triage responsibility',
      'Zendesk and Intercom integrations',
    ],
  },
  {
    title: 'Enterprise',
    price: 'Contact us',
    period: '',
    cta: 'Request trial',
    features: [
      'All Business features +',
      'Advanced Linear Asks',
      'Issue SLAs',
      'Sub-initiatives',
      'SAML and SCIM',
      'Advanced security',
      'Migration and onboarding support',
    ],
  },
])
</script>

<style scoped>
.components-page { display: grid; gap: 1.5rem; padding: 1rem var(--page-padding-inline, 24px) 2rem; }
.page-header .lead { color: var(--color-text-secondary, #d0d6e0); }
.section h3 { margin-bottom: .5rem; }
.row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.grid { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.toggle-field { display:flex; align-items:center; justify-content: space-between; gap: 1rem; }
.footer-actions { display:flex; gap:.5rem; justify-content:flex-end; }
@media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
</style>


