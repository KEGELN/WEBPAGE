import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      teamName?: string;
      team2Name?: string;
      leagueName?: string;
      modes?: string[];
      notes?: string;
    };

    if (!body.teamName?.trim()) {
      return NextResponse.json({ error: 'teamName required' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Email service not configured (RESEND_API_KEY missing)' }, { status: 503 });
    }

    const resend = new Resend(apiKey);
    const adminEmail = process.env.ADMIN_EMAIL || 'lennardsdrojek42@gmail.com';
    const requestedAt = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    const modes = (body.modes ?? []).join(', ') || 'keine ausgewählt';

    // Build the CLI command for easy copy-paste
    const modeFlags = (body.modes ?? []).map((m) => `--modes ${m}`).join(' ');
    const team2Flag = body.team2Name ? ` --team2 "${body.team2Name}"` : '';
    const cliCmd = `python analyse_team.py --team "${body.teamName}"${team2Flag} ${modeFlags} --email ${adminEmail}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f9f9f9">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e0e0e0">
    <h1 style="color:#e71f53;font-size:22px;margin:0 0 6px">Analyse-Anfrage</h1>
    <p style="color:#888;font-size:12px;margin:0 0 28px">Kegler Hub · ${requestedAt}</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#888;width:140px">Team</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:bold">${body.teamName}</td></tr>
      ${body.team2Name ? `
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#888">Vergleichs-Team</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-weight:bold">${body.team2Name}</td></tr>` : ''}
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#888">Liga</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0">${body.leagueName || '—'}</td></tr>
      <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#888">Module</td>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0">${modes}</td></tr>
    </table>

    ${body.notes?.trim() ? `
    <div style="margin-bottom:24px">
      <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Anmerkungen</div>
      <div style="background:#f9f9f9;border-radius:8px;padding:14px;font-size:14px;line-height:1.6;white-space:pre-wrap">${body.notes.trim()}</div>
    </div>` : ''}

    <div style="background:#1a1a2e;border-radius:8px;padding:16px;margin-bottom:24px">
      <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;color:#aaa">CLI-Befehl</div>
      <code style="color:#7dd3fc;font-size:12px;word-break:break-all">${cliCmd}</code>
    </div>

    <p style="font-size:11px;color:#bbb;margin:0">
      Kegler Hub Berlin · Automatisch generiert
    </p>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: 'Kegler Hub <noreply@keglerhub.de>',
      to: adminEmail,
      subject: `Analyse: ${body.teamName}${body.team2Name ? ` vs ${body.team2Name}` : ''}`,
      html: emailHtml,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
