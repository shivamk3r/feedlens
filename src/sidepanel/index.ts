const root = document.querySelector("#feedlens-sidepanel-root");

if (root) {
  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">Feed Lens Details</div>
        <div class="fl-brand__tagline">Post analysis</div>
      </div>
    </header>
    <section class="fl-main">
      <div class="fl-card">
        <h2>No post selected</h2>
        <p>Open LinkedIn and select a Feed Lens marker to inspect the analysis.</p>
      </div>
    </section>
  `;
}

export {};
