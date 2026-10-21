import nodemailer from 'nodemailer';

export interface SendInviteParams {
  to: string;
  candidateName: string;
  orgName: string;
  interviewTitle: string;
  subject: string;
  messageText: string;
  inviteUrl: string;
}

export interface MailResult {
  sent: boolean;
  message: string;
  previewUrl?: string;
  realSmtpUsed: boolean;
}

export async function sendInterviewInviteEmail(params: SendInviteParams): Promise<MailResult> {
  const { to, candidateName, orgName, interviewTitle, subject, messageText, inviteUrl } = params;

  const smtpHost = process.env.SMTP_HOST || (process.env.SMTP_USER?.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"${orgName}" <${smtpUser || 'no-reply@talentai.com'}>`;

  const htmlContent = `
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
        <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 800;">${orgName}</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600;">TalentAI Assessment Dispatch System</p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 24px; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 800;">Hello ${candidateName},</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line;">
          ${messageText}
        </p>
        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; padding: 14px 18px; border-radius: 10px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Interview Assessment</p>
          <p style="margin: 4px 0 0; font-size: 16px; color: #0f172a; font-weight: 800;">${interviewTitle}</p>
        </div>
        
        <div style="text-align: center; margin: 28px 0;">
          <a href="${inviteUrl}" target="_blank" style="background: linear-gradient(135deg,#2563eb,#1d4ed8); color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 800; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
            🚀 Start Technical Assessment Session →
          </a>
        </div>
      </div>
      
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0; word-break: break-all;">
        Or click/copy this direct link: <br/>
        <a href="${inviteUrl}" target="_blank" style="color: #2563eb; font-weight: 600;">${inviteUrl}</a>
      </p>
    </div>
  `;

  // 1. If SMTP credentials exist in process.env, send via real SMTP (Gmail, SendGrid, etc.)
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 4000,
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: `${messageText}\n\nStart Assessment: ${inviteUrl}`,
        html: htmlContent,
      });

      console.log(`✅ Real Email dispatched to ${to}. Message ID: ${info.messageId}`);
      return {
        sent: true,
        message: `Invitation email dispatched directly to ${to}!`,
        realSmtpUsed: true,
      };
    } catch (err: any) {
      console.error('SMTP email dispatch error:', err);
    }
  }

  // 2. Instant zero-latency fallback: log immediately without blocking network calls
  console.log(`\n📧 [EMAIL INVITE PREPARED] To: ${to} | Subject: ${subject} | Link: ${inviteUrl}\n`);
  return {
    sent: true,
    message: `Invitation email prepared for ${to}!`,
    realSmtpUsed: false,
  };
}

export interface SendDecisionParams {
  to: string;
  candidateName: string;
  orgName: string;
  decision: 'SELECTED' | 'REJECTED';
  jobTitle?: string;
  subject?: string;
  messageText?: string;
}

export async function sendDecisionEmail(params: SendDecisionParams): Promise<MailResult> {
  const { to, candidateName, orgName, decision, jobTitle = 'Software Engineer', subject: customSubject, messageText: customMessage } = params;

  const isSelection = decision === 'SELECTED';
  const defaultSubject = isSelection
    ? `🎉 Offer of Selection / Next Steps: ${jobTitle} at ${orgName}`
    : `Update regarding your application for ${jobTitle} at ${orgName}`;

  const defaultMessage = isSelection
    ? `Congratulations ${candidateName}!\n\nWe are pleased to inform you that following your technical assessment evaluation, you have been SELECTED for the ${jobTitle} position at ${orgName}. Our recruitment team will follow up with formal onboarding details shortly.`
    : `Dear ${candidateName},\n\nThank you for taking the time to complete the technical assessment for the ${jobTitle} position at ${orgName}.\n\nAfter careful review of your evaluation results, we regret to inform you that we will not be moving forward with your application for this role. We appreciate your interest and wish you the best in your career endeavors.`;

  const subject = customSubject || defaultSubject;
  const messageText = customMessage || defaultMessage;

  const smtpHost = process.env.SMTP_HOST || (process.env.SMTP_USER?.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"${orgName}" <${smtpUser || 'no-reply@talentai.com'}>`;

  const themeColor = isSelection ? '#16a34a' : '#dc2626';
  const headerBadge = isSelection ? 'SELECTION NOTICE' : 'APPLICATION UPDATE';

  const htmlContent = `
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
        <h2 style="color: ${themeColor}; margin: 0; font-size: 22px; font-weight: 800;">${orgName}</h2>
        <p style="color: #64748b; font-size: 12px; margin-top: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${headerBadge}</p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 24px; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 800;">Hello ${candidateName},</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line;">
          ${messageText}
        </p>
      </div>
      
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        Sent via ${orgName} Candidate Evaluation System
      </p>
    </div>
  `;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: messageText,
        html: htmlContent,
      });

      console.log(`✅ Decision Email (${decision}) dispatched to ${to}. ID: ${info.messageId}`);
      return {
        sent: true,
        message: `${isSelection ? 'Selection' : 'Rejection'} email dispatched directly to ${to}!`,
        realSmtpUsed: true,
      };
    } catch (err: any) {
      console.error('SMTP decision email error:', err);
    }
  }

  // Fast fallback without blocking network calls
  console.log(`\n📧 [DECISION EMAIL READY] Decision: ${decision} | To: ${to} | Subject: ${subject}\n`);
  return {
    sent: true,
    message: `${isSelection ? 'Selection' : 'Rejection'} email generated for ${to}!`,
    realSmtpUsed: false,
  };
}

export interface SendWelcomeParams {
  to: string;
  name: string;
  role: string;
  companyName?: string;
}

export async function sendWelcomeEmail(params: SendWelcomeParams): Promise<MailResult> {
  const { to, name, role, companyName = 'TalentAI Systems' } = params;

  const isStudent = role === 'STUDENT';
  const planTitle = isStudent ? 'Student Pass ($20/mo)' : 'Organisation Plan ($100/mo)';
  const subject = `🎉 Welcome to TalentAI, ${name}! Your Account is Ready`;

  const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const dashboardUrl = `${appUrl.replace(/\/$/, '')}/dashboard`;

  const htmlContent = `
    <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 620px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #0f172a; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 28px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-weight: 900; font-size: 20px; margin-bottom: 10px;">
          ✦
        </div>
        <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.02em;">Welcome to TalentAI!</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 6px; font-weight: 600;">Autonomous AI Interview & Assessment Ecosystem</p>
      </div>

      <div style="background-color: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 800;">Hello ${name},</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.65; margin-bottom: 20px;">
          Thank you for joining <strong>TalentAI</strong>! Your registration was completed successfully. You now have full access to our state-of-the-art AI-powered platform tailored to accelerate your technical success.
        </p>

        <!-- Account Badge Box -->
        <div style="background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.08)); border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 4px 0;">Account Type:</td>
              <td style="color: #7c3aed; font-weight: 800; text-align: right;">${planTitle}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 4px 0;">Workspace:</td>
              <td style="color: #0f172a; font-weight: 700; text-align: right;">${companyName}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600; padding: 4px 0;">Email:</td>
              <td style="color: #0f172a; font-weight: 700; text-align: right;">${to}</td>
            </tr>
          </table>
        </div>

        <!-- Features list -->
        <h4 style="color: #0f172a; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 12px;">Here is what you can do right away:</h4>
        <ul style="color: #334155; font-size: 13px; line-height: 1.8; margin: 0 0 24px; padding-left: 20px;">
          ${isStudent ? `
            <li><strong>4,000+ LeetCode DSA Problems:</strong> Practice with automated test case evaluation and optimal complexity benchmarks.</li>
            <li><strong>Competitive Coding Arena:</strong> Challenge peers in real-time 1v1 algorithmic duels.</li>
            <li><strong>Rigorous ATS Resume Parser:</strong> Upload your CV for instant entity segregation and honest ATS fit scoring.</li>
            <li><strong>Mock Technical Interviews:</strong> Test your skills with AI webcam proctoring and personalized feedback.</li>
          ` : `
            <li><strong>Autonomous Candidate Screening:</strong> Conduct 10× faster video + coding technical interviews.</li>
            <li><strong>Anti-Plagiarism Guard:</strong> Auto-track tab switches, copy-paste violations, and multi-face events.</li>
            <li><strong>Automated Assessment Invitations:</strong> Dispatch personalized links via Email, Phone/SMS, or WhatsApp.</li>
            <li><strong>Candidate Pipeline Dashboard:</strong> Review detailed AI scorecards, code submissions, and downloadable PDF dossiers.</li>
          `}
        </ul>

        <div style="text-align: center; margin: 30px 0 10px;">
          <a href="${dashboardUrl}" target="_blank" style="background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 6px 20px rgba(124,58,237,0.35);">
            🚀 Launch Your Dashboard →
          </a>
        </div>
      </div>

      <div style="text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 4px;">Need assistance or have questions? Simply reply directly to this email or visit our help center.</p>
        <p style="margin: 0;">© ${new Date().getFullYear()} TalentAI Systems Inc. All rights reserved.</p>
      </div>
    </div>
  `;

  const textMessage = `Hello ${name}!\n\nWelcome to TalentAI! Your ${planTitle} account is active and ready.\nAccess your dashboard here: ${dashboardUrl}\n\nHappy coding & hiring!`;

  const smtpHost = process.env.SMTP_HOST || (process.env.SMTP_USER?.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `"TalentAI Systems" <${smtpUser || 'no-reply@talentai.com'}>`;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: textMessage,
        html: htmlContent,
      });

      console.log(`✅ Welcome Email dispatched to ${to}. Message ID: ${info.messageId}`);
      return {
        sent: true,
        message: `Welcome email dispatched directly to ${to}!`,
        realSmtpUsed: true,
      };
    } catch (err: any) {
      console.error('SMTP welcome email error:', err);
    }
  }

  // Fast fallback without blocking network calls
  console.log(`\n📧 [WELCOME EMAIL READY] To: ${to} | Role: ${role} | Company: ${companyName}\n`);
  return {
    sent: true,
    message: `Welcome email prepared for ${to}!`,
    realSmtpUsed: false,
  };
}

