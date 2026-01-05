const { EmailClient } = require("@azure/communication-email");

module.exports = async function (context, req) {
  try {
    // Handle preflight (safe no-op for same-origin, but fine to include)
    if ((req.method || "").toUpperCase() === "OPTIONS") {
      context.res = { status: 204 };
      return;
    }

    const connectionString = process.env.ACS_CONNECTION_STRING;
    if (!connectionString) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { ok: false, error: "Missing ACS_CONNECTION_STRING" }
      };
      return;
    }

    const toEmail = process.env.CONTACT_TO_EMAIL || "info@naemedsolutions.com";
    const fromEmail = process.env.ACS_FROM_EMAIL || "donotreply@naemedsolutions.com";

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const name = body.name || "";
    const email = body.email || "";
    const subject = body.subject || "Website contact form";
    const message = body.message || "";

    const client = new EmailClient(connectionString);

    const emailMessage = {
      senderAddress: fromEmail,
      content: {
        subject: `[Contact] ${subject}`,
        plainText: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
      },
      recipients: {
        to: [{ address: toEmail }]
      }
    };

    const poller = await client.beginSend(emailMessage);
    const result = await poller.pollUntilDone();

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, messageId: result?.id || null, status: result?.status || null }
    };
  } catch (err) {
    context.log("Contact email send error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { ok: false, error: err?.message || String(err) }
    };
  }
};
