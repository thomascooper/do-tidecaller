import { useState } from "react";
import { encodeShare } from "../lib/share";
import type { State } from "../lib/model";
import type { Item } from "../lib/types";
import { SITE_URL } from "../site";

/** Link to the current settings: on the current origin when not on production, so a preview links to itself. */
function shareUrl(state: State, items: Item[]) {
  const { code, itemsOmitted } = encodeShare(state, items);
  const origin = window.location.hostname === new URL(SITE_URL).hostname ? SITE_URL : window.location.origin;
  return { url: `${origin}/?s=${code}`, itemsOmitted };
}

export function ShareLink({ state, items }: { state: State; items: Item[] }) {
  const [link, setLink] = useState<{ url: string; itemsOmitted: boolean; copied: boolean } | null>(null);

  const copy = async () => {
    const { url, itemsOmitted } = shareUrl(state, items);
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      // clipboard unavailable: the text field below is the fallback
    }
    setLink({ url, itemsOmitted, copied });
  };

  return (
    <div className="share">
      <button className="chip" type="button" onClick={copy}>
        Copy link to these settings
      </button>
      <span role="status" className="hint">
        {link?.copied ? "Link copied" : ""}
      </span>
      {link && !link.copied && (
        <label className="field full">
          <span>Copy this link</span>
          <input id="shareLink" type="text" readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} />
        </label>
      )}
      {link?.itemsOmitted && <p className="hint">Your added items were too many to fit in a link, so it carries settings only.</p>}
    </div>
  );
}
