const root = document.querySelector("#feedlens-popup-root");

if (root) {
  root.innerHTML = `
    <header class="fl-topbar">
      <div class="fl-brand">
        <div class="fl-brand__name">Feed Lens</div>
        <div class="fl-brand__tagline">LinkedIn information lens</div>
      </div>
    </header>
    <section class="fl-main">
      <div class="fl-card">
        <h2>Setup needed</h2>
        <p>Add your Gemini API key in settings to start analyzing visible LinkedIn posts.</p>
        <div class="fl-actions">
          <button class="fl-button fl-button--primary" id="feedlens-open-options">Open settings</button>
        </div>
      </div>
    </section>
  `;

  root.querySelector("#feedlens-open-options")?.addEventListener("click", () => {
    void chrome.runtime.openOptionsPage();
  });
}

export {};
