import { Injectable } from '@nestjs/common';

export const TRANSACTIONAL_EMAIL_SERVICE = Symbol(
  'TRANSACTIONAL_EMAIL_SERVICE',
);

export interface UserInvitationEmailInput {
  email: string;
  name: string;
  role: string;
  temporaryPassword: string;
  invitedByEmail: string;
}

export interface TransactionalEmailService {
  sendUserInvitation(input: UserInvitationEmailInput): Promise<void>;
}

@Injectable()
export class ResendEmailService implements TransactionalEmailService {
  private readonly resendApiUrl = 'https://api.resend.com/emails';

  async sendUserInvitation(input: UserInvitationEmailInput): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      throw new Error(
        'RESEND_API_KEY and RESEND_FROM_EMAIL must be configured for invite delivery',
      );
    }

    const response = await fetch(this.resendApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.email],
        subject: 'Your Drive Insight account invitation',
        text: [
          `Hello ${input.name},`,
          '',
          'Your Drive Insight account is ready.',
          `Role: ${input.role}`,
          `Temporary password: ${input.temporaryPassword}`,
          '',
          'You will be required to change this password after your first login.',
          `Invitation sent by: ${input.invitedByEmail}`,
        ].join('\n'),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Resend invite delivery failed (${response.status}): ${errorBody}`,
      );
    }
  }
}
