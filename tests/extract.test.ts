import { describe, expect, it } from "vitest";
import { extractPostText, getVisiblePostEntries } from "../src/content/extract";

function visible(element: HTMLElement): void {
  element.getBoundingClientRect = () =>
    ({
      width: 540,
      height: 320,
      top: 80,
      left: 20,
      right: 560,
      bottom: 400,
      x: 20,
      y: 80,
      toJSON: () => ({})
    }) as DOMRect;
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
});
