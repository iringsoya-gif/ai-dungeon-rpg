export default function StreamText({ text, isStreaming }) {
  return (
    <div className="font-mono text-emerald-200 leading-relaxed whitespace-pre-wrap">
      {text}
      {isStreaming && <span className="animate-pulse text-emerald-400">▋</span>}
    </div>
  )
}