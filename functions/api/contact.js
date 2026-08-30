/*
 * POST /api/contact  -  contact form backend for a static site on Cloudflare Pages.
 *
 * Cloudflare Pages turns every file under functions/ into a route, so this file
 * answers /api/contact. There is no build step, no npm, and no wrangler config.
 * Push the repo and the endpoint exists.
 *
 * Configure it with environment variables in the Cloudflare dashboard, under
 * Workers and Pages > the project > Settings > Variables and secrets:
 *
 *   CONTACT_TO      Inbox that receives the messages. Must be a verified
 *                   destination address under Email Routing on the same account.
 *   CONTACT_FROM    Address the mail is sent from, on the site's own domain,
 *                   for example form@example.com. Nothing has to receive mail
 *                   there, it only has to exist as a sender.
 *   CF_ACCOUNT_ID   Account ID from the Workers and Pages overview page.
 *   CF_EMAIL_TOKEN  API token with the "Email Sending: Edit" permission.
 *                   Add this one as a secret, not a plain text variable.
 *
 * Sending to a verified destination address on your own account is free on
 * every Cloudflare plan, including the free one, and does not count against any
 * sending quota. That is the point of this setup: no third party service and
 * nothing for the site owner to sign up for beyond Cloudflare itself.
 *
 * RESEND_API_KEY is an optional escape hatch. Set it and this endpoint sends
 * through Resend instead, which delivers to any address rather than only to
 * verified ones. CONTACT_TO and CONTACT_FROM still apply.
 *
 * With none of it configured the endpoint answers 501 and the front end falls
 * back to opening the visitor's mail app, so the form is never a dead end.
 */

const LIMITS = { name: 120, email: 200, message: 6000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const jsonResponse = function (data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
};

/* A submit with JavaScript switched off lands here too, so answer that one with
   something a browser can render instead of raw JSON. */
const pageResponse = function (data, status) {
  const line = data.ok
    ? "Message sent. Thanks, you will hear back soon."
    : "That message did not send. Please send an email instead.";
  const body =
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>Contact</title></head>" +
    '<body style="font:16px/1.6 system-ui,sans-serif;margin:12vh auto;max-width:34rem;padding:0 1.5rem">' +
    "<p>" + line + '</p><p><a href="/">Back to the site</a></p></body></html>';
  return new Response(body, {
    status: status || 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
};

/* Which mail path is configured, if any. */
const provider = function (env) {
  if (!env.CONTACT_TO || !env.CONTACT_FROM) return null;
  if (env.RESEND_API_KEY) return "resend";
  if (env.CF_ACCOUNT_ID && env.CF_EMAIL_TOKEN) return "cloudflare";
  return null;
};

/* Collapses whitespace and strips line breaks, which also stops anyone from
   smuggling extra mail headers in through the name or email field. */
const oneLine = function (value, max) {
  return String(value == null ? "" : value)
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
};

const readFields = async function (request) {
  const type = request.headers.get("content-type") || "";
  if (type.indexOf("application/json") !== -1) {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  }
  const form = await request.formData();
  const out = {};
  form.forEach(function (value, key) { out[key] = value; });
  return out;
};

const sendWithCloudflare = async function (env, mail) {
  const url =
    "https://api.cloudflare.com/client/v4/accounts/" +
    env.CF_ACCOUNT_ID +
    "/email/sending/send";
  const headers = {
    authorization: "Bearer " + env.CF_EMAIL_TOKEN,
    "content-type": "application/json"
  };
  const payload = {
    from: env.CONTACT_FROM,
    to: env.CONTACT_TO,
    subject: mail.subject,
    text: mail.text,
    reply_to: mail.replyTo
  };

  let res = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify(payload) });
  if (res.status === 400) {
    /* Some accounts reject reply_to. Losing the reply header beats losing the
       message, and the address is in the body anyway. */
    delete payload.reply_to;
    res = await fetch(url, { method: "POST", headers: headers, body: JSON.stringify(payload) });
  }
  return res;
};

const sendWithResend = function (env, mail) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      subject: mail.subject,
      text: mail.text,
      reply_to: mail.replyTo
    })
  });
};

/* GET /api/contact reports whether the mail path is wired up. Handy on handover
   day: curl it and you know in one second whether the form will deliver. */
export function onRequestGet(context) {
  const how = provider(context.env);
  return jsonResponse({ ok: true, configured: Boolean(how), provider: how });
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;
  const wantsJson = (request.headers.get("accept") || "").indexOf("application/json") !== -1;
  const respond = function (data, status) {
    return wantsJson ? jsonResponse(data, status) : pageResponse(data, status);
  };

  let fields;
  try {
    fields = await readFields(request);
  } catch (err) {
    return respond({ ok: false, code: "bad_request" }, 400);
  }

  /* Two cheap spam traps: a hidden field a human never sees, and a form filled
     out faster than anyone can type. Both answer as if the send worked, so a
     bot learns nothing from the response. */
  if (String(fields._gotcha || "").length) return respond({ ok: true }, 200);
  const started = Number(fields._t);
  if (started > 0 && Date.now() - started < 2000) return respond({ ok: true }, 200);

  const name = oneLine(fields.name, LIMITS.name);
  const email = oneLine(fields.email, LIMITS.email);
  const message = String(fields.message == null ? "" : fields.message).trim().slice(0, LIMITS.message);

  const bad = [];
  if (!name) bad.push("name");
  if (!EMAIL_RE.test(email)) bad.push("email");
  if (!message) bad.push("message");
  if (bad.length) return respond({ ok: false, code: "invalid", fields: bad }, 422);

  const how = provider(env);
  if (!how) return respond({ ok: false, code: "not_configured" }, 501);

  const site = new URL(request.url).hostname;
  const mail = {
    subject: site + ": message from " + name,
    replyTo: email,
    text: [
      "Name:    " + name,
      "Email:   " + email,
      "Sent:    " + new Date().toISOString(),
      "Country: " + ((request.cf && request.cf.country) || "unknown"),
      "",
      message,
      ""
    ].join("\n")
  };

  let res;
  try {
    res = how === "resend" ? await sendWithResend(env, mail) : await sendWithCloudflare(env, mail);
  } catch (err) {
    console.log("contact: send threw", String(err));
    return respond({ ok: false, code: "send_failed" }, 502);
  }

  if (!res.ok) {
    /* Shows up in the dashboard log stream and in wrangler pages deployment tail. */
    console.log("contact: " + how + " returned " + res.status, await res.text());
    return respond({ ok: false, code: "send_failed" }, 502);
  }

  return respond({ ok: true }, 200);
}
