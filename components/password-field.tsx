"use client";

import { useState, type InputHTMLAttributes } from "react";

export function PasswordField(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const inputClassName = ["password-input", props.className].filter(Boolean).join(" ");

  return (
    <div className="password-field">
      <input {...props} className={inputClassName} type={visible ? "text" : "password"} />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        <span className={`password-eye${visible ? " is-visible" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}
