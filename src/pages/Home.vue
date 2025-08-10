<template>
  <div class="home">
    <header class="hero">
      <div class="hero__content">
        <div class="badge">Automation Lab Control</div>
        <h1 class="title">SDF — Orchestrate your automation lab</h1>
        <p class="subtitle">Monitor robots, schedule jobs, and keep your operations on track with a unified control surface.</p>
        <div class="actions">
          <a class="btn btn-secondary" href="#features">Explore Features</a>
        </div>
      </div>
    </header>

    <section id="features" class="features">
      <div class="grid">
        <article class="card">
          <h3>Realtime Monitoring</h3>
          <p>Track device health, throughput, and alerts with live telemetry dashboards.</p>
        </article>
        <article class="card">
          <h3>Job Orchestration</h3>
          <p>Plan and automate sequential workflows across stations and robots.</p>
        </article>
        <article class="card">
          <h3>3D/2D Floor Plan</h3>
          <p>Design, visualize, and validate spatial constraints before deployment.</p>
        </article>
        <article class="card">
          <h3>Safety & Compliance</h3>
          <p>Define zones, interlocks, and audit trails that meet lab policy.</p>
        </article>
      </div>
    </section>

    <section class="cta">
      <div class="cta__content">
        <h2>Bring clarity to your automation operations</h2>
        <p>Use SDF to standardize lab control, reduce downtime, and accelerate delivery.</p>
      </div>
    </section>
  </div>
  
</template>

<script setup lang="ts"></script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.hero {
  position: relative;
  isolation: isolate;
  padding-block: 8rem;
  /* remove bottom border to avoid visible line over the hero image */
  border-bottom: 0;
  background: var(--color-bg-marketing, #010102);
  overflow: hidden;
}

.hero::before {
  content: "";
  position: absolute;
  /* extend by 1px to prevent subpixel seam at the bottom */
  inset: -2px;
  background-image:
    linear-gradient(to bottom, rgba(0,0,0,.5), rgba(0,0,0,.5)),
    url('/lab-hero.jpg');
  background-size: cover, cover;
  background-position: center, center;
  background-repeat: no-repeat, no-repeat;
  filter: grayscale(100%) blur(2px) brightness(0.8) contrast(1.05) saturate(1.02);
  transform: scale(1.05);
  pointer-events: none;
  z-index: -2;
}
/* removed ::after; overlay merged into ::before background stack to avoid height mismatch */

.hero__content {
  max-width: var(--page-max-width, 1024px);
  margin: 0 auto;
  padding: 0 var(--page-padding-inline, 24px);
  text-align: center;
}

/* hero media moved to background via ::before */

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border-secondary, #34343a);
  background: var(--color-bg-translucent, rgba(255,255,255,0.05));
  border-radius: var(--radius-rounded, 9999px);
  color: var(--color-text-secondary, #d0d6e0);
  font-size: var(--font-size-mini, 0.75rem);
}

.title {
  margin-top: 1rem;
  font: var(--title-7, 590 3.5rem/1.1 var(--font-regular, 'Inter Variable'));
  letter-spacing: var(--title-7-letter-spacing, -0.022em);
  color: var(--color-text-primary, #f7f8f8);
  /* 더 큰 화면에서 조금 더 키우고, 모바일에서는 축소 */
  font-size: clamp(2rem, 6vw, 3.75rem);
}

.subtitle {
  margin-top: 1rem;
  color: var(--color-text-tertiary, #8a8f98);
  font-size: clamp(1rem, 2.2vw, 1.25rem);
  line-height: var(--text-large-line-height, 1.6);
}

.actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.625rem 1rem;
  border-radius: var(--radius-6, 6px);
  border: 1px solid transparent;
  text-decoration: none;
}

.btn-primary {
  background: var(--color-accent, #7170ff);
  color: var(--color-brand-text, #fff);
}
.btn-primary:hover { background: var(--color-accent-hover, #828fff); }

.btn-secondary {
  background: var(--color-bg-tertiary, #232326);
  color: var(--color-text-primary, #f7f8f8);
  border-color: var(--color-border-secondary, #34343a);
}
.btn-secondary:hover { background: var(--color-bg-quaternary, #28282c); }

.features {
  padding-block: 3rem;
}

.grid {
  max-width: var(--page-max-width, 1024px);
  margin: 0 auto;
  padding: 0 var(--page-padding-inline, 24px);
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
}

.card {
  grid-column: span 6;
  border: 1px solid var(--color-border-primary, #23252a);
  background: var(--color-bg-level-1, #0f1011);
  border-radius: var(--radius-8, 8px);
  padding: 1rem;
}

.card h3 {
  font: var(--title-2, 590 1.3125rem/1.33 var(--font-regular));
  color: var(--color-text-primary, #f7f8f8);
}

.card p {
  margin-top: 0.5rem;
  color: var(--color-text-secondary, #d0d6e0);
  line-height: 1.6;
}

@media (max-width: 900px) {
  .card { grid-column: span 12; }
}

.cta {
  border-top: 1px solid var(--color-border-primary, #23252a);
  padding-block: 4rem;
  background: var(--color-bg-level-0, #08090a);
}

.cta__content {
  max-width: var(--page-max-width, 1024px);
  margin: 0 auto;
  padding: 0 var(--page-padding-inline, 24px);
  text-align: center;
}

.cta__content h2 {
  font: var(--title-4, 590 2rem/1.125 var(--font-regular));
}

.cta__content p {
  margin-top: 0.5rem;
  color: var(--color-text-secondary, #d0d6e0);
}
</style>


