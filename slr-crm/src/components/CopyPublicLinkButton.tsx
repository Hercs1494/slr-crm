'use client';
import { useState } from 'react';

export default function CopyPublicLinkButton({ quoteId }: { quoteId: string }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const r = await fetch(`/api/quotes/${quoteId}/public-link`);
      const j = await r.json();
      await navigator.clipboard.writeText(j.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} className="px-3 py-1.5 rounded border">
      {loading ? 'Generating…' : (copied ? 'Copied!' : 'Copy Public Link')}
    </button>
  );
}
