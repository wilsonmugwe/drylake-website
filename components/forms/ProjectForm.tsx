"use client";

import Script from "next/script";
import { Check, LoaderCircle, Send } from "lucide-react";
import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function ProjectForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("sending");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const turnstileToken = String(
      formData.get("cf-turnstile-response") || ""
    );

    if (!turnstileToken) {
      setStatus("error");
      setError("Please complete the security verification.");
      return;
    }

    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      company: String(formData.get("company") || ""),
      projectType: String(formData.get("projectType") || ""),
      budget: String(formData.get("budget") || ""),
      message: String(formData.get("message") || ""),
      turnstileToken,
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to send your enquiry."
        );
      }

      form.reset();
      setStatus("success");
    } catch (err) {
      setStatus("error");

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    }
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[420px] flex-col justify-center rounded-[2rem] border border-black/10 bg-[#f4f2ec] p-8 sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
          <Check size={20} />
        </div>

        <h2 className="mt-7 text-4xl font-semibold tracking-[-0.055em]">
          Thanks.
        </h2>

        <p className="mt-3 max-w-md leading-7 text-black/50">
          We&apos;ve received your enquiry.
        </p>

        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-8 w-fit text-sm font-semibold underline underline-offset-4"
        >
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />

      <form onSubmit={handleSubmit} className="space-y-7">
        <div className="grid gap-7 sm:grid-cols-2">
          <Field
            label="Name"
            name="name"
            required
            maxLength={120}
            placeholder="Your name"
          />

          <Field
            label="Email"
            name="email"
            type="email"
            required
            maxLength={200}
            placeholder="you@company.com"
          />
        </div>

        <div className="grid gap-7 sm:grid-cols-2">
          <Field
            label="Company"
            name="company"
            maxLength={160}
            placeholder="Company name"
          />

          <div>
            <label
              htmlFor="projectType"
              className="section-label text-black/40"
            >
              What do you need?
            </label>

            <select
              id="projectType"
              name="projectType"
              defaultValue=""
              className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none focus:border-black"
            >
              <option value="" disabled>
                Select an option
              </option>
              <option>Custom Software</option>
              <option>Business Automation</option>
              <option>Systems Integration</option>
              <option>Technical Setup</option>
              <option>Not sure yet</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="budget"
            className="section-label text-black/40"
          >
            Project size
          </label>

          <select
            id="budget"
            name="budget"
            defaultValue=""
            className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none focus:border-black"
          >
            <option value="" disabled>
              Optional
            </option>
            <option>Small technical job</option>
            <option>Defined project</option>
            <option>Ongoing technical work</option>
            <option>Not sure yet</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="message"
            className="section-label text-black/40"
          >
            Tell us about the problem
          </label>

          <textarea
            id="message"
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            placeholder="What is happening, what should be happening, and what is getting in the way?"
            className="mt-2 w-full resize-none border-b border-black/15 bg-transparent py-4 text-base leading-7 outline-none placeholder:text-black/25 focus:border-black"
          />
        </div>

        {turnstileSiteKey ? (
          <div
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
            data-theme="light"
            data-size="flexible"
          />
        ) : (
          <p className="text-sm text-red-700">
            Security verification is unavailable.
          </p>
        )}

        {status === "error" && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            status === "sending" || !turnstileSiteKey
          }
          className="group flex w-full items-center justify-between rounded-full bg-black px-6 py-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
        >
          {status === "sending"
            ? "Sending..."
            : "Send enquiry"}

          {status === "sending" ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Send
              size={17}
              className="transition-transform group-hover:translate-x-1"
            />
          )}
        </button>
      </form>
    </>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  maxLength,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="section-label text-black/40"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none placeholder:text-black/25 focus:border-black"
      />
    </div>
  );
}