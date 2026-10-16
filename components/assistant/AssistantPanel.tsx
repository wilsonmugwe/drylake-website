"use client";

import { useEffect, useRef, useState } from "react";

import AssistantEscalationForm from "@/components/assistant/AssistantEscalationForm";
import TurnstileWidget, { type TurnstileHandle } from "@/components/forms/TurnstileWidget";
import {
  BASIS_LABEL,
  DISCLOSURE,
  GUIDED_DISCLOSURE,
  GUIDED_QUICK_QUESTIONS,
  MAX_INPUT_CHARS,
  PRIVACY_NOTE,
  type AssistantIntent,
  type AssistantReplyPayload,
} from "@/lib/assistant/constants";
import { sendMessage, startSession } from "@/lib/assistant/client";
import { ASSISTANT_ACTION } from "@/lib/contact/turnstile-action";

/*
 * The chat dialog. Loaded lazily by AssistantLauncher. A native <dialog> opened with showModal()
 * gives the focus trap, Esc to close and an inert page behind it. Everything the model says is
 * rendered as TEXT nodes (React escapes it): no raw-HTML escape hatch is used anywhere here.
 * Nothing is persisted: the conversation lives in component state and ends when the panel closes.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type Message =
  | { id: number; from: "visitor"; text: string }
  | { id: number; from: "assistant"; reply: AssistantReplyPayload }
  | { id: number; from: "notice"; text: string };

type NewMessage = Message extends infer M ? (M extends { id: number } ? Omit<M, "id"> : never) : never;

const QUICK_QUESTIONS: ReadonlyArray<[label: string, question: string]> = [
  ["Our services", "What services does Drylake offer?"],
  ["Websites", "Tell me about Drylake's website services."],
  ["Custom software", "Tell me about custom software."],
  ["Business automation", "Tell me about business automation."],
];

const chip =
  "min-h-[44px] border border-black/25 bg-white px-3 py-2 text-left text-sm font-semibold text-black hover:border-black";

/* guided: LLM_GATEWAY_PROVIDER=guided uses no AI, so the copy must not claim one (set by AssistantMount). */
export default function AssistantPanel({ onClose, guided: GUIDED = false }: { onClose: () => void; guided?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const nextId = useRef(1);
  const [session, setSession] = useState("");
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<null | { wantsHuman: boolean }>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  const add = (message: NewMessage) =>
    setMessages((all) => [...all, { ...message, id: nextId.current++ } as Message]);

  async function onToken(token: string) {
    if (session || checking) return;
    setChecking(true);
    const result = await startSession(token);
    setChecking(false);
    if (result.ok) {
      setSession(result.sessionToken);
      setNotice("");
      return;
    }
    setNotice(result.message);
    turnstile.current?.reset();
  }

  async function ask(text: string) {
    const question = text.trim();
    if (!question || !session || busy) return;
    const history: Array<{ role: "visitor" | "assistant"; text: string }> = [];
    for (const m of messages) {
      if (m.from === "visitor") history.push({ role: "visitor", text: m.text });
      else if (m.from === "assistant") history.push({ role: "assistant", text: m.reply.answer });
    }
    add({ from: "visitor", text: question });
    setDraft("");
    setBusy(true);
    const result = await sendMessage(session, question, history.slice(-6));
    setBusy(false);
    if (result.ok) {
      add({ from: "assistant", reply: result.reply });
    } else {
      add({ from: "notice", text: result.message });
      if (result.sessionEnded) setSession("");
    }
  }

  function intentButton(intent: AssistantIntent) {
    const style = "mt-2 inline-flex min-h-[44px] items-center border border-black bg-black px-4 text-sm font-semibold !text-white";
    if (intent === "open_booking") {
      return (
        <a href="/consultation" className={style}>
          Book a free 30-minute consultation
        </a>
      );
    }
    const wantsHuman = intent === "request_human";
    return (
      <button type="button" onClick={() => setForm({ wantsHuman })} className={style}>
        {wantsHuman ? "Speak to a representative" : "Send an enquiry"}
      </button>
    );
  }

  const ready = Boolean(session);
  const quickQuestions = GUIDED ? GUIDED_QUICK_QUESTIONS : QUICK_QUESTIONS;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="assistant-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        dialogRef.current?.close();
      }}
      className="fixed inset-0 m-0 hidden h-[100dvh] max-h-none w-full max-w-none flex-col overflow-hidden border-0 bg-white p-0 text-black backdrop:bg-black/40 open:flex sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(40rem,calc(100dvh-2rem))] sm:w-[25rem] sm:border sm:border-black/20 sm:shadow-2xl"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-black/15 px-4 py-3">
        <div className="min-w-0">
          <h2 id="assistant-title" ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
            Drylake assistant
          </h2>
          <p className="mt-0.5 text-sm font-semibold text-black/80">{GUIDED ? GUIDED_DISCLOSURE : DISCLOSURE}</p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close chat"
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-black/25 text-lg leading-none"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </header>

      {form ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AssistantEscalationForm wantsHuman={form.wantsHuman} onBack={() => setForm(null)} />
        </div>
      ) : (
        <>
          <div ref={logRef} role="log" aria-live="polite" aria-label="Conversation" className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-3 text-sm leading-6">
            <p className="text-black/70">{PRIVACY_NOTE}</p>
            {messages.map((m) =>
              m.from === "visitor" ? (
                <p key={m.id} className="ml-8 break-words bg-black px-3 py-2 text-white">
                  {m.text}
                </p>
              ) : m.from === "notice" ? (
                <p key={m.id} role="alert" className="break-words border-l-2 border-red-700 pl-3 text-red-700">
                  {m.text}
                </p>
              ) : (
                <div key={m.id} className="mr-4 break-words bg-[#f4f2ec] px-3 py-2">
                  <p className="whitespace-pre-line">{m.reply.answer}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-black/60">{BASIS_LABEL[m.reply.basis]}</p>
                  {m.reply.sources.length > 0 && (
                    <ul className="mt-1 text-xs">
                      {m.reply.sources.map((s) =>
                        s.url ? (
                          <li key={s.id}>
                            <a href={s.url} className="inline-flex min-h-[32px] items-center underline">
                              {s.title}
                            </a>
                          </li>
                        ) : null
                      )}
                    </ul>
                  )}
                  {m.reply.followUps && m.reply.followUps.length > 0 && (
                    <ul aria-label="Related questions" className="mt-2 flex flex-col gap-2">
                      {m.reply.followUps.map((f) => (
                        <li key={f.question}>
                          <button type="button" disabled={busy} onClick={() => ask(f.question)} className={`${chip} w-full disabled:opacity-50`}>
                            {f.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.reply.escalation && (
                    <div className="mt-2 flex flex-col items-start">
                      {intentButton("open_booking")}
                      {intentButton("open_enquiry")}
                      {intentButton("request_human")}
                    </div>
                  )}
                  {m.reply.intent && intentButton(m.reply.intent)}
                </div>
              )
            )}
            {busy && <p className="text-black/60">{GUIDED ? "Finding an answer" : "Thinking"}</p>}
          </div>

          <div className="space-y-3 border-t border-black/15 px-4 py-3">
            {!ready && SITE_KEY && (
              <div>
                <p className="mb-1 text-xs text-black/70">{checking ? "Starting chat" : "Quick security check to start the chat."}</p>
                <TurnstileWidget
                  ref={turnstile}
                  siteKey={SITE_KEY}
                  action={ASSISTANT_ACTION}
                  onToken={onToken}
                  onTokenCleared={() => undefined}
                  onUnavailable={() => setNotice("The security check could not load. You can still send a message or book a consultation.")}
                />
              </div>
            )}
            {notice && (
              <p role="alert" className="text-sm text-red-700">
                {notice}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {quickQuestions.map(([label, question]) => (
                <button key={label} type="button" disabled={!ready || busy} onClick={() => ask(question)} className={`${chip} disabled:opacity-50`}>
                  {label}
                </button>
              ))}
              <a href="/consultation" className={`${chip} flex items-center`}>
                Book a free 30-minute consultation
              </a>
              <button type="button" onClick={() => setForm({ wantsHuman: false })} className={chip}>
                Send an enquiry
              </button>
              <button type="button" onClick={() => setForm({ wantsHuman: true })} className={`${chip} col-span-2`}>
                Speak to a representative
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void ask(draft);
              }}
              className="flex gap-2"
            >
              <label className="sr-only" htmlFor="assistant-input">
                Your message
              </label>
              <textarea
                id="assistant-input"
                value={draft}
                maxLength={MAX_INPUT_CHARS}
                rows={2}
                disabled={!ready}
                placeholder={ready ? "Ask about Drylake" : "Complete the check to chat"}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void ask(draft);
                  }
                }}
                className="min-w-0 flex-1 resize-none border border-black/25 px-3 py-2 text-base outline-none focus:border-black disabled:bg-black/5"
              />
              <button type="submit" disabled={!ready || busy || !draft.trim()} className="min-h-[44px] bg-black px-4 text-sm font-semibold text-white disabled:opacity-50">
                Send
              </button>
            </form>
          </div>
        </>
      )}
    </dialog>
  );
}
