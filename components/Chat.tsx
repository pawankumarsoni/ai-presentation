'use client';

import { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

export function Chat({
  messages,
  onSend,
  busy,
}: {
  messages: { role: 'user' | 'assistant'; text: string }[];
  onSend: (s: string) => void;
  busy: boolean;
}) {
  const [v, setV] = useState('');
  const submit = () => {
    if (!v.trim() || busy) return;
    onSend(v.trim());
    setV('');
  };

  return (
    <aside className="chat">
      <div className="chat-head">
        <div>
          <b>Deck AI</b>
          <span>Agentic editor</span>
        </div>
        <Sparkles size={17} />
      </div>
      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <h3>What are we building?</h3>
            <p>Generate a deck, rewrite a slide, add a chart, or move an element. AI mutations land on the canvas as tools complete.</p>
            <div className="chips">
              <button onClick={() => setV('Create a 5-slide product roadmap with a revenue chart and milestones table')}>
                Product roadmap
              </button>
              <button onClick={() => setV('Make slide 2 more concise and formal')}>Refine slide 2</button>
              <button onClick={() => setV('Add a bar chart of quarterly revenue to slide 3')}>Add chart</button>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div>{m.text}</div>
          </div>
        ))}
        {busy && (
          <div className="msg assistant">
            <div>
              <Loader2 className="spin" size={16} /> Applying tools…
            </div>
          </div>
        )}
      </div>
      <div className="composer">
        <textarea
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask AI to change the deck…"
        />
        <button onClick={submit} disabled={busy || !v.trim()}>
          <Send size={16} />
        </button>
      </div>
    </aside>
  );
}
