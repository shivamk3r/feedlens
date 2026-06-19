import { describe, expect, it } from "vitest";
import { extractPostText, getVisiblePostEntries } from "../src/content/extract";

function positioned(element: HTMLElement, top: number, bottom: number): void {
  element.getBoundingClientRect = () =>
    ({
      width: 540,
      height: bottom - top,
      top,
      left: 20,
      right: 560,
      bottom,
      x: 20,
      y: top,
      toJSON: () => ({})
    }) as DOMRect;
}

function visible(element: HTMLElement): void {
  positioned(element, 80, 400);
}

describe("LinkedIn post extraction", () => {
  it("extracts human post text while ignoring common feed controls", () => {
    document.body.innerHTML = `
      <div class="feed-shared-update-v2" data-urn="urn:li:activity:123">
        <a class="update-components-actor__meta-link"><span aria-hidden="true">Asha Builder</span></a>
        <div class="update-components-actor__sub-description">2h</div>
        <div class="update-components-text">
          AI adoption is moving fast, but teams still need clear evaluation criteria.
          Here are three practical checks: source quality, measurable outcomes, and reversibility.
        </div>
        <button>Like</button>
        <button>Comment</button>
        <div class="social-details-social-counts">42 reactions</div>
      </div>
    `;

    const post = document.querySelector<HTMLElement>(".feed-shared-update-v2");
    expect(post).toBeTruthy();

    const text = extractPostText(post as HTMLElement);
    expect(text).toContain("AI adoption is moving fast");
    expect(text).toContain("source quality");
    expect(text).not.toContain("Like");
    expect(text).not.toContain("42 reactions");
  });

  it("returns visible deduplicated posts with author and URL context", async () => {
    document.body.innerHTML = `
      <main>
        <div class="feed-shared-update-v2" data-urn="urn:li:activity:123">
          <a class="update-components-actor__meta-link" href="/in/asha"><span aria-hidden="true">Asha Builder</span></a>
          <a href="https://www.linkedin.com/feed/update/urn:li:activity:123">permalink</a>
          <div class="update-components-text">
            AI adoption is moving fast, but teams still need clear evaluation criteria.
            Here are three practical checks: source quality, measurable outcomes, and reversibility.
          </div>
        </div>
        <div class="feed-shared-update-v2" data-urn="urn:li:activity:456">
          <div class="update-components-text">
            AI adoption is moving fast, but teams still need clear evaluation criteria.
            Here are three practical checks: source quality, measurable outcomes, and reversibility.
          </div>
        </div>
      </main>
    `;

    document
      .querySelectorAll<HTMLElement>(".feed-shared-update-v2")
      .forEach((element) => visible(element));

    const entries = await getVisiblePostEntries({ maxPosts: 5 });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.post.postId).toBe("urn:li:activity:123");
    expect(entries[0]?.post.author).toBe("Asha Builder");
    expect(entries[0]?.post.url).toBe("https://www.linkedin.com/feed/update/urn:li:activity:123");
  });

  it("detects posts in LinkedIn's SDUI main feed listitem layout", async () => {
    document.body.innerHTML = `
      <div data-sdui-screen="com.linkedin.sdui.flagshipnav.feed.MainFeed">
        <div data-testid="mainFeed" role="list">
          <div>
            <div role="listitem">
              <a href="/in/someone">Author Name</a>
              <div>
                This is the current LinkedIn feed layout where each post card is exposed
                as a list item inside the main feed rather than the older feed-shared
                update container.
              </div>
              <div role="button">Like</div>
              <div role="button">Comment</div>
              <div data-testid="commentList123">A visible comment should not become post text.</div>
              <div class="video-js">
                <span class="vjs-control-text">Play Video</span>
                <span class="vjs-duration-display">0:30</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const post = document.querySelector<HTMLElement>("[role='listitem']");
    expect(post).toBeTruthy();
    visible(post as HTMLElement);

    const entries = await getVisiblePostEntries({ maxPosts: 5 });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.post.postId).toMatch(/^feedlens:/);
    expect(entries[0]?.post.text).toContain("current LinkedIn feed layout");
    expect(entries[0]?.post.text).not.toContain("Like");
    expect(entries[0]?.post.text).not.toContain("visible comment");
    expect(entries[0]?.post.text).not.toContain("Play Video");
  });

  it("can include nearby below-viewport posts for background pre-analysis", async () => {
    document.body.innerHTML = `
      <main>
        <div class="feed-shared-update-v2" data-urn="urn:li:activity:nearby">
          <div class="update-components-text">
            This post starts just below the viewport but is already loaded in the DOM,
            so FeedLens can analyze it shortly before the user scrolls it into view.
          </div>
        </div>
      </main>
    `;

    const post = document.querySelector<HTMLElement>(".feed-shared-update-v2");
    expect(post).toBeTruthy();
    positioned(post as HTMLElement, window.innerHeight + 120, window.innerHeight + 420);

    await expect(getVisiblePostEntries({ maxPosts: 5 })).resolves.toHaveLength(0);
    await expect(
      getVisiblePostEntries({ maxPosts: 5, lookaheadPixels: 500 })
    ).resolves.toHaveLength(1);
  });
});
