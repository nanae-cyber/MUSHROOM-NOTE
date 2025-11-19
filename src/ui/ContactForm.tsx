import React, { useState } from "react";
import { t } from "../i18n";

export function ContactForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !message) {
      return;
    }

    setSending(true);
    setStatus("idle");

    try {
      // FormSubmitを使ってメール送信
      const response = await fetch("https://formsubmit.co/ajax/kyans_com@yahoo.co.jp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
          _subject: `MUSHROOM NOTE お問い合わせ - ${name}`,
          _template: "table",
        }),
      });

      if (response.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setStatus("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            padding: "24px 20px",
            color: "#fff",
            textAlign: "center",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
            }}
            aria-label={t("close")}
          >
            ✕
          </button>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            📧 {t("contact_form_title")}
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} style={{ padding: "24px 20px" }}>
          <div style={{ display: "grid", gap: 16 }}>
            {/* 名前 */}
            <div style={{ display: "grid", gap: 6 }}>
              <label
                htmlFor="contact-name"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {t("contact_name")}
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("contact_name_placeholder")}
                required
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </div>

            {/* メールアドレス */}
            <div style={{ display: "grid", gap: 6 }}>
              <label
                htmlFor="contact-email"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {t("contact_email")}
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("contact_email_placeholder")}
                required
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </div>

            {/* お問い合わせ内容 */}
            <div style={{ display: "grid", gap: 6 }}>
              <label
                htmlFor="contact-message"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {t("contact_message")}
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("contact_message_placeholder")}
                required
                rows={6}
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* ステータスメッセージ */}
            {status === "success" && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#d1fae5",
                  color: "#065f46",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                ✓ {t("contact_success")}
              </div>
            )}

            {status === "error" && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                ✗ {t("contact_error")}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={sending || !name || !email || !message}
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 12,
                border: "none",
                background:
                  sending || !name || !email || !message
                    ? "#d1d5db"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor:
                  sending || !name || !email || !message
                    ? "not-allowed"
                    : "pointer",
                boxShadow:
                  sending || !name || !email || !message
                    ? "none"
                    : "0 4px 12px rgba(16, 185, 129, 0.4)",
              }}
            >
              {sending ? t("contact_sending") : t("contact_send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
