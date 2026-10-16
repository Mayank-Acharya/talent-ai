export interface SendSmsInviteParams {
  candidatePhone: string;
  candidateName: string;
  orgName: string;
  interviewTitle: string;
  inviteUrl: string;
  customMessage?: string;
}

export interface SmsResult {
  sent: boolean;
  message: string;
  whatsappUrl: string;
  smsUrl: string;
  formattedText: string;
  realTwilioUsed: boolean;
  sid?: string;
}

/**
 * Format clean international phone number without spaces or dashes
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Dispatch SMS / WhatsApp invitation
 */
export async function sendInterviewInviteSMS(params: SendSmsInviteParams): Promise<SmsResult> {
  const { candidatePhone, candidateName, orgName, interviewTitle, inviteUrl, customMessage } = params;
  const cleanPhone = cleanPhoneNumber(candidatePhone);

  const defaultText = `Hi ${candidateName}! You have been invited by ${orgName} to take your technical assessment for "${interviewTitle}". Start here: ${inviteUrl} (Valid for 7 days)`;
  const bodyText = customMessage ? `${customMessage}\n\nStart assessment: ${inviteUrl}` : defaultText;

  // Build 1-click WhatsApp deep-link
  // Format: https://wa.me/<number>?text=<encoded_text>
  const waNumber = cleanPhone.replace(/^\+/, '');
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(bodyText)}`;

  // Build native device SMS scheme
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(bodyText)}`;

  // 1. Real Twilio SMS integration if credentials configured
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      // Direct REST dispatch to Twilio without extra heavy SDK
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`);
      params.append('From', twilioFrom);
      params.append('Body', bodyText);

      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const twilioData: any = await twilioRes.json();
      if (twilioRes.ok && twilioData.sid) {
        console.log(`✅ [TWILIO SMS SENT] To: ${cleanPhone} | SID: ${twilioData.sid}`);
        return {
          sent: true,
          message: `SMS invitation dispatched directly to ${cleanPhone} via Twilio!`,
          whatsappUrl,
          smsUrl,
          formattedText: bodyText,
          realTwilioUsed: true,
          sid: twilioData.sid,
        };
      }
    } catch (err: any) {
      console.error('Twilio SMS dispatch failed:', err);
    }
  }

  // 2. High-fidelity logger and WhatsApp / SMS share generation
  console.log(`\n📱 [SMS / PHONE INVITATION GENERATED]`);
  console.log(`Candidate: ${candidateName} | Phone: ${cleanPhone}`);
  console.log(`Message: ${bodyText}`);
  console.log(`WhatsApp Link: ${whatsappUrl}`);
  console.log(`SMS Link: ${smsUrl}`);
  console.log(`-----------------------------------------\n`);

  return {
    sent: true,
    message: `Assessment link prepared for phone number ${cleanPhone}! Ready to send via SMS or WhatsApp.`,
    whatsappUrl,
    smsUrl,
    formattedText: bodyText,
    realTwilioUsed: false,
  };
}
