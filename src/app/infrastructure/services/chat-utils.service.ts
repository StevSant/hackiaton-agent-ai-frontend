import { Injectable } from '@angular/core';
import type { ChatMessage, EventType } from '@core/models/chat-model';

@Injectable({
  providedIn: 'root',
})
export class ChatUtilsService {
  /**
   * Genera un ID único para mensajes
   */
  generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Formatea timestamp a hora legible
   */
  formatTimestamp(timestamp: number): string {
    const date =
      timestamp > 1000000000000
        ? new Date(timestamp)
        : new Date(timestamp * 1000);

    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Obtiene la etiqueta visual para un tipo de evento
   */
  getEventLabel(event: string): string {
    const labels: { [key: string]: string } = {
      UserMessage: '👤 Tú',
      RunResponse: '🤖 Asistente',
      RunCompleted: '✅ Completado',
      RunStarted: '🚀 Iniciado',
      UpdatingMemory: '🧠 Memoria',
      ToolCallStarted: '🔧 Herramienta',
      Error: '❌ Error',
      Cancelled: '🚫 Cancelado',
    };
    return labels[event] || `📋 ${event}`;
  }

  /**
   * Determina si un mensaje es del usuario
   */
  isUserMessage(message: ChatMessage): boolean {
    return message.event === 'UserMessage';
  }

  /**
   * Determina si un mensaje es del sistema
   */
  isSystemMessage(message: ChatMessage): boolean {
    return [
      'UpdatingMemory',
      'ToolCallStarted',
      'RunStarted',
      'Cancelled',
    ].includes(message.event);
  }

  /**
   * Determina si un mensaje es del bot
   */
  isBotMessage(message: ChatMessage): boolean {
    return ['RunResponse', 'RunCompleted'].includes(message.event);
  }

  /**
   * Determina si un mensaje es de error
   */
  isErrorMessage(message: ChatMessage): boolean {
    return message.event === 'Error';
  }

  /**
   * Crea un mensaje de usuario
   */
  createUserMessage(content: string): ChatMessage {
    return {
      id: this.generateId(),
      content,
      displayedContent: content,
      isComplete: true,
      isStreaming: false,
      event: 'UserMessage' as EventType,
      timestamp: Date.now(),
    };
  }

  /**
   * Crea un mensaje del sistema
   */
  createSystemMessage(content: string, event: EventType): ChatMessage {
    return {
      id: this.generateId(),
      content,
      displayedContent: content,
      isComplete: true,
      isStreaming: false,
      event,
      timestamp: Date.now(),
    };
  }

  /**
   * Crea un mensaje de bot
   */
  createBotMessage(runId: string, timestamp?: number): ChatMessage {
    return {
      id: runId || this.generateId(),
      content: '',
      displayedContent: '',
      isComplete: false,
      isStreaming: true,
      event: 'RunResponse' as EventType,
      timestamp: timestamp || Date.now(),
    };
  }

  /**
   * Función para trackBy en ngFor
   */
  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id;
  }

  /**
   * Pre-sanitize LLM text before passing it to Markdown/innerHTML.
   * - Removes dangerous tags (script, style, iframe, object, embed, svg, math, link, meta, base, audio, video, source, track)
   * - Strips inline event handlers (on*)
   * - Neutralizes javascript: and data: urls in href/src
   * This is a defensive cleanup to reduce Angular sanitizer warnings; Angular's built-in sanitizer still runs.
   */
  cleanForMarkdown(input: string): string {
    if (!input) return '';
    let s = input;
    // Remove whole blocks of dangerous elements
    const blockTags = /(script|style|iframe|object|embed|svg|math|audio|video|source|track|link|meta|base)/gi;
    s = s.replace(new RegExp(`<(${blockTags.source})[^>]*>[\s\S]*?<\/\\1>`, 'gi'), '');
    // Remove self-closing dangerous elements
    s = s.replace(new RegExp(`<(${blockTags.source})[^>]*\/?>`, 'gi'), '');
    // Remove inline event handlers (on*) attributes
    s = s.replace(/\son[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g, '');
    // Neutralize javascript: or data: in href/src
    s = s.replace(/(href|src)\s*=\s*(["'])(javascript:|data:)[^"']*\2/gi, '$1="#"');
    // Also neutralize without quotes
    s = s.replace(/(href|src)\s*=\s*(javascript:|data:)[^\s>]+/gi, '$1="#"');
    return s;
  }
}
