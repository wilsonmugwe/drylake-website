"use client";

import Script from "next/script";
import {
  Check,
  LoaderCircle,
  Send,
} from "lucide-react";
import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function ProjectForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
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
      setError(
        "Please complete the security verification."
      );
      return;
    }

    /*
     * Keep the existing API property names so the current
     * /api/contact route continues to work without changes.
     *
     * projectType now represents the area of the problem.
     * budget now represents the likely engagement type.
     */
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      company: String(formData.get("company") || ""),
      projectType: String(
        formData.get("projectType") || ""
      ),
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

  /* =====================================================
     SUCCESS STATE
     ===================================================== */

  if (status === "success") {
    return (
      <div className="flex min-h-[440px] flex-col justify-center border border-black/10 bg-[#f4f2ec] p-7 sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
          <Check size={20} />
        </div>

        <p className="section-label mt-7 text-black/35">
          Enquiry received
        </p>

        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Thanks for reaching out.
        </h2>

        <p className="mt-4 max-w-lg leading-7 text-black/50">
          We&apos;ve received your enquiry. We&apos;ll review what
          you&apos;ve shared and use it as the starting point for
          the conversation.
        </p>

        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-8 w-fit border-b border-black pb-1 text-sm font-semibold"
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

      <form
        onSubmit={handleSubmit}
        className="space-y-8"
      >
        {/* Name + email */}
        <div className="grid gap-7 sm:grid-cols-2">
          <Field
            label="Your name"
            name="name"
            required
            maxLength={120}
            placeholder="Your name"
          />

          <Field
            label="Work email"
            name="email"
            type="email"
            required
            maxLength={200}
            placeholder="you@company.com"
          />
        </div>

        {/* Company */}
        <Field
          label="Business / organisation"
          name="company"
          maxLength={160}
          placeholder="Company name"
        />

        {/* Problem category */}
        <div>
          <label
            htmlFor="projectType"
            className="section-label text-black/40"
          >
            Where is the friction?
          </label>

          <select
            id="projectType"
            name="projectType"
            defaultValue=""
            className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none transition-colors focus:border-black"
          >
            <option value="" disabled>
              Select the closest option
            </option>

            <option value="Manual processes">
              Too much manual work
            </option>

            <option value="Disconnected systems">
              Our systems don&apos;t work well together
            </option>

            <option value="Existing software">
              We&apos;ve outgrown our current software
            </option>

            <option value="Customer experience">
              Customers should be able to do more online
            </option>

            <option value="Reporting and data">
              Reporting or data is difficult to manage
            </option>

            <option value="Website and digital">
              Website or digital presence
            </option>

            <option value="AI opportunity">
              We&apos;re exploring where AI could help
            </option>

            <option value="Other">
              Something else
            </option>

            <option value="Not sure">
              Not sure yet
            </option>
          </select>
        </div>

        {/* Engagement */}
        <div>
          <label
            htmlFor="budget"
            className="section-label text-black/40"
          >
            What kind of help are you looking for?
          </label>

          <select
            id="budget"
            name="budget"
            defaultValue=""
            className="mt-2 w-full border-b border-black/15 bg-transparent py-4 text-base outline-none transition-colors focus:border-black"
          >
            <option value="" disabled>
              Optional
            </option>

            <option value="Solve a specific problem">
              Solve a specific problem
            </option>

            <option value="Build a new system">
              Build a new system
            </option>

            <option value="Improve an existing system">
              Improve something we already use
            </option>

            <option value="Ongoing technical support">
              Ongoing technical work
            </option>

            <option value="Explore options">
              Help us work out what makes sense
            </option>

            <option value="Not sure">
              Not sure yet
            </option>
          </select>
        </div>

        {/* Main problem */}
        <div>
          <label
            htmlFor="message"
            className="section-label text-black/40"
          >
            Tell us what&apos;s happening
          </label>

          <textarea
            id="message"
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={7}
            placeholder="What happens today? What is taking too long, creating extra work or causing problems? What would you like to work better?"
            className="mt-2 w-full resize-none border-b border-black/15 bg-transparent py-4 text-base leading-7 outline-none placeholder:text-black/25 focus:border-black"
          />

          <p className="mt-3 text-xs leading-5 text-black/35">
            Don&apos;t worry about technical terminology. Describe
            the problem the way you would explain it to someone
            inside the business.
          </p>
        </div>

        {/* Security */}
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

        {/* Error */}
        {status === "error" && (
          <p
            role="alert"
            className="border-l-2 border-red-700 pl-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <div className="flex flex-col gap-3 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xs text-xs leading-5 text-black/35">
            No technical specification required. Just give us
            enough context to understand where to start.
          </p>

          <button
            type="submit"
            disabled={
              status === "sending" ||
              !turnstileSiteKey
            }
            className="group flex w-full items-center justify-between rounded-full bg-black px-6 py-4 font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
          >
            <span>
              {status === "sending"
                ? "Sending..."
                : "Start the conversation"}
            </span>

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
        </div>
      </form>
    </>
  );
}

/* =========================================================
   REUSABLE TEXT FIELD
   ========================================================= */

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