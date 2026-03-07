import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async sendCredentials(email: string, fullName: string, password: string): Promise<void> {
    await this.mailer.sendMail({
      to: email,
      subject: 'Your CRM Account Credentials',
      template: 'credentials',       
      context: { fullName, email, password },
    });
  }

  async sendResetPasswordEmail(email: string, fullName: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.mailer.sendMail({
      to: email,
      subject: 'Parolni tiklash',
      template: 'reset-password',     
      context: { fullName, resetLink },
    });
  }
}