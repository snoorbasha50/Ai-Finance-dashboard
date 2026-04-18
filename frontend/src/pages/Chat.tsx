import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../api';
import { ChatMessage } from '../types';

const SUGGESTIONS = [
  'How much did I spend this month?',
  'What are my top 3 expense categories?',
  'How much did I receive in total?',
  'Give me 3 tips to save money based on my spending',
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI financial assistant. Ask me anything about your transactions — spending patterns, savings tips, category breakdowns, and more.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.filter((m) => m.role !== 'assistant' || messages.indexOf(m) > 0);
      const res = await aiApi.chat(question, history);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your API keys and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">AI Financial Assistant</h2>
        <p className="text-gray-400 text-sm mt-1">Ask questions about your spending in plain English</p>
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="bg-dark-800 border border-dark-500 hover:border-accent-500 text-gray-300 hover:text-white text-sm px-4 py-2 rounded-full transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 bg-dark-800 rounded-xl border border-dark-600 p-6 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent-500 text-white rounded-br-sm'
                  : 'bg-dark-700 text-gray-200 rounded-bl-sm border border-dark-500'
              }`}
            >
              {msg.role === 'assistant' && (
                <span className="text-xs text-gray-500 block mb-1">🤖 Finance AI</span>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-dark-700 border border-dark-500 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="text-xs text-gray-500 block mb-1">🤖 Finance AI</span>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Ask about your spending..."
          disabled={loading}
          className="flex-1 bg-dark-800 border border-dark-600 focus:border-accent-500 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="bg-accent-500 hover:bg-accent-400 disabled:opacity-40 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
