const root = document.querySelector("#feedlens-options-root");

if (root) {
  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">Feed Lens Settings</div>
        <div class="fl-brand__tagline">Gemini-only local configuration</div>
      </div>
    </header>
    <section class="fl-main fl-options-layout">
      <div class="fl-card">
        <h2>Gemini access</h2>
        <p>Settings UI will be enabled in the next implementation milestone.</p>
      </div>
    </section>
  `;
}

export {};
