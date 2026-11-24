"use client";

import { memo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

type HastNode = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };

const hastText = (n: HastNode | undefined): string =>
  !n ? "" : n.type === "text" ? (n.value ?? "") : (n.children ?? []).map(hastText).join("");

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return { copied, copy };
}

function CodeBlock({ lang, code, children }: { lang: string; code: string; children: React.ReactNode }) {
  const { copied, copy } = useCopy();
  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d] text-[13px]">
      <div className="flex items-center justify-between bg-[#2f2f2f] px-4 py-1.5 text-xs text-neutral-300">
        <span>{lang || "text"}</span>
        <button onClick={() => copy(code)} className="flex items-center gap-1 hover:text-white">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 leading-relaxed text-neutral-100">{children}</pre>
    </div>
  );
}

const components: Components = {
  pre({ node, children }) {
    const codeEl = (node?.children?.[0] ?? undefined) as HastNode | undefined;
    const cls = (codeEl?.properties?.className as string[] | undefined) ?? [];
    const lang = cls.find((c) => c.startsWith("language-"))?.slice(9) ?? "";
    return (
      <CodeBlock lang={lang} code={hastText(codeEl).replace(/\n$/, "")}>
        {children}
      </CodeBlock>
    );
  },
  code({ className, children, ...props }) {
    // Block code is wrapped by <pre> above; this styles inline code.
    const isBlock = /language-|hljs/.test(className ?? "");
    if (isBlock) return <code className={className}>{children}</code>;
    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.875em]" {...props}>
        {children}
      </code>
    );
  },
  a({ children, ...props }) {
    return (
      <a {...props} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto">
        <table>{children}</table>
      </div>
    );
  },
};

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
