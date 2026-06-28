export default function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-blue-600 flex items-center justify-center flex-shrink-0 text-sm">✨</div>
      <div className="message-ai flex items-center gap-1 py-4">
        <span className="typing-dot w-2 h-2 rounded-full bg-brand-400 inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-brand-400 inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-brand-400 inline-block" />
      </div>
    </div>
  );
}
