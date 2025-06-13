import { TelegramConfig } from '../types';

export class TelegramService {
  private static async sendRequest(endpoint: string, params: Record<string, any>) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${params.token}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      return await response.json();
    } catch (error) {
      console.error('Telegram API error:', error);
      throw error;
    }
  }

  static async testConnection(config: TelegramConfig): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.sendRequest('getMe', { token: config.botToken });
      if (result.ok) {
        return {
          success: true,
          message: `Successfully connected to bot: ${result.result.username}`
        };
      }
      return {
        success: false,
        message: `Failed to connect: ${result.description || 'Unknown error'}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection error: ${error.message || 'Unknown error'}`
      };
    }
  }

  static async sendMessage(config: TelegramConfig, message: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.sendRequest('sendMessage', {
        token: config.botToken,
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML'
      });

      if (result.ok) {
        return {
          success: true,
          message: 'Message sent successfully'
        };
      }
      return {
        success: false,
        message: `Failed to send message: ${result.description || 'Unknown error'}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error sending message: ${error.message || 'Unknown error'}`
      };
    }
  }

  static async sendNotification(config: TelegramConfig, title: string, content: string): Promise<{ success: boolean; message: string }> {
    const formattedMessage = `
<b>${title}</b>

${content}

<i>Sent via Surprise Sender</i>
    `.trim();

    return this.sendMessage(config, formattedMessage);
  }

  static async getBotInfo(config: TelegramConfig): Promise<{ success: boolean; data?: any; message: string }> {
    try {
      const result = await this.sendRequest('getMe', { token: config.botToken });
      if (result.ok) {
        return {
          success: true,
          data: result.result,
          message: 'Bot info retrieved successfully'
        };
      }
      return {
        success: false,
        message: `Failed to get bot info: ${result.description || 'Unknown error'}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error getting bot info: ${error.message || 'Unknown error'}`
      };
    }
  }
} 