import "server-only";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  vendor_moderator: "Vendor Moderator",
  support_admin: "Support Admin",
  finance_admin: "Finance Admin",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function isBrevoEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

async function sendEmail(email: string, subject: string, htmlContent: string, textContent: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) throw new Error("Brevo transactional email is not configured.");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME || "Evntora" },
      to: [{ email }], subject, htmlContent, textContent,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Brevo rejected transactional email (${response.status}).`);
}

function permissionText(permissions: string[]) {
  return permissions.length ? permissions.map((permission) => `• ${permission}`).join("\n") : "No permissions are currently assigned to this role. Contact the Platform Owner for clarification.";
}

export async function sendAdminAccessGrantedEmail(email: string, adminRole: string, permissions: string[]) {
  const role = roleLabels[adminRole];
  if (!role) throw new Error("Unknown administrator role.");
  const safeRole = escapeHtml(role);
  const safePermissions = escapeHtml(permissionText(permissions)).replace(/\n/g, "<br/>");
  const plainPermissions = permissionText(permissions);
  const subject = "Your Evntora Admin Access Has Been Granted";
  const text = `Your email address has been granted ${role} access to Evntora.\n\nPermissions:\n${plainPermissions}\n\nUse your existing Evntora email and password to access the Admin workspace. Your Customer and Vendor access and password have not been changed.`;
  const html = `<div style="font-family:Arial,sans-serif;color:#30221D;background:#FFF3E3;padding:32px"><div style="max-width:600px;margin:auto;background:#FFFCF6;border:1px solid #EAD2B0;border-radius:20px;padding:32px"><p style="color:#B77A36;letter-spacing:3px">EVNTORA</p><h1 style="color:#681B1D">Admin access granted</h1><p>Your email address has been granted the <strong>${safeRole}</strong> role.</p><p><strong>Permissions</strong><br/>${safePermissions}</p><p>Sign in with your existing Evntora email and password. Your password and other workspace memberships have not been changed.</p></div></div>`;
  await sendEmail(email, subject, html, text);
}

export async function sendAdminInvitationEmail(email: string, adminRole: string, otp: string, activationUrl: string, permissions: string[]) {
  const role = roleLabels[adminRole];
  if (!role || !/^\d{6}$/.test(otp)) throw new Error("Invalid administrator invitation email data.");
  const safeRole = escapeHtml(role);
  const plainPermissions = permissionText(permissions);
  const safePermissions = escapeHtml(plainPermissions).replace(/\n/g, "<br/>");
  const safeOtp = escapeHtml(otp);
  const safeUrl = escapeHtml(activationUrl);
  const subject = "You're Invited to Join Evntora as an Administrator";
  const text = `You have been invited to Evntora as ${role}.\n\nPermissions:\n${plainPermissions}\n\nYour one-time email verification code is: ${otp}\n\nEnter this code at ${activationUrl}. After verification, establish your password. The code expires according to the Supabase Auth email OTP settings.`;
  const html = `<div style="font-family:Arial,sans-serif;color:#30221D;background:#FFF3E3;padding:32px"><div style="max-width:600px;margin:auto;background:#FFFCF6;border:1px solid #EAD2B0;border-radius:20px;padding:32px"><p style="color:#B77A36;letter-spacing:3px">EVNTORA</p><h1 style="color:#681B1D">Administrator invitation</h1><p>You have been invited to join Evntora as a <strong>${safeRole}</strong>.</p><p><strong>Permissions</strong><br/>${safePermissions}</p><p>Enter this one-time email verification code in Evntora:</p><p style="font-size:28px;letter-spacing:8px;font-weight:bold;color:#681B1D">${safeOtp}</p><p><a href="${safeUrl}" style="display:inline-block;background:#681B1D;color:white;padding:12px 20px;border-radius:10px;text-decoration:none">Continue account activation</a></p><p>After email verification, you will establish your password. Never share this code.</p></div></div>`;
  await sendEmail(email, subject, html, text);
}

export async function sendAdminInvitationNotice(email: string, adminRole: string, activationUrl: string, permissions: string[], passwordSetupRequired = false) {
  const role = roleLabels[adminRole];
  if (!role) throw new Error("Unknown administrator role.");
  const safeRole = escapeHtml(role);
  const plainPermissions = permissionText(permissions);
  const safePermissions = escapeHtml(plainPermissions).replace(/\n/g, "<br/>");
  const safeUrl = escapeHtml(activationUrl);
  const subject = "You're Invited to Join Evntora as an Administrator";
  const passwordMessage = passwordSetupRequired
    ? "After verifying your email, establish the password for this existing, unverified identity. Your other workspace memberships remain unchanged."
    : "Your existing account password and other workspace memberships will remain unchanged.";
  const text = `You have been invited to Evntora as ${role}.\n\nPermissions:\n${plainPermissions}\n\nUse the verification code sent separately by Evntora Auth, then continue at ${activationUrl}. ${passwordMessage}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#30221D;background:#FFF3E3;padding:32px"><div style="max-width:600px;margin:auto;background:#FFFCF6;border:1px solid #EAD2B0;border-radius:20px;padding:32px"><p style="color:#B77A36;letter-spacing:3px">EVNTORA</p><h1 style="color:#681B1D">Administrator invitation</h1><p>You have been invited to join Evntora as a <strong>${safeRole}</strong>.</p><p><strong>Permissions</strong><br/>${safePermissions}</p><p>Use the verification code sent separately by Evntora Auth, then continue here:</p><p><a href="${safeUrl}" style="display:inline-block;background:#681B1D;color:white;padding:12px 20px;border-radius:10px;text-decoration:none">Verify invitation</a></p><p>${escapeHtml(passwordMessage)}</p></div></div>`;
  await sendEmail(email, subject, html, text);
}
