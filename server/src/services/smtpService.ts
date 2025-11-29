import nodemailer, { Transporter, SentMessageInfo, TransportOptions } from 'nodemailer';
import { SmtpConfiguration } from '../entities';
import { validateSmtpConfig } from '../utils/smtp';

export class SmtpService {
  private transporterPool: Map<string, Transporter> = new Map();

  public async getTransporter(config: SmtpConfiguration): Promise<Transporter> {
    const key = `${config.host}:${config.port}:${config.username}`;

    if (this.transporterPool.has(key)) {
      return this.transporterPool.get(key)!;
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: typeof config.port === 'string' ? parseInt(config.port) : config.port,
      secure: config.port === 465 || config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 14, // 14 messages per second
      rateDelta: 1000, // 1 second
    } as TransportOptions);

    await transporter.verify();
    this.transporterPool.set(key, transporter);
    return transporter;
  }

  public async cleanup(): Promise<void> {
    for (const transporter of this.transporterPool.values()) {
      try {
        await transporter.close();
      } catch (error) {
        console.error('Error closing transporter:', error);
      }
    }
    this.transporterPool.clear();
  }
}
