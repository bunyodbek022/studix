import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
@Module({
    imports: [MailerModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
            transport: {
                host: config.get<string>('SMTP_HOST'),
                port: config.get<number>('SMTP_PORT'),
                secure: false,
                auth: {
                    user: config.get<string>('SMTP_USER'),
                    pass: config.get<string>('SMTP_PASS'),
                },
            },
            defaults: {
                from: `"Studix" <${config.get('SMTP_FROM')}>`,
            },
            template: {
                dir: join(process.cwd(), 'src', 'common', 'mail', 'template'),
                adapter: new HandlebarsAdapter(),
                options: { strict: true },
            },
        }),
        inject: [ConfigService],
    })],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }