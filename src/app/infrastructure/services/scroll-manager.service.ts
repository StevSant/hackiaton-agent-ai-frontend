import { Injectable, type ElementRef } from "@angular/core"

@Injectable({
  providedIn: "root",
})
export class ScrollManagerService {
  private shouldScrollToBottom = false

  /**
   * Programa un scroll hacia abajo en el próximo ciclo
   */
  scheduleScrollToBottom(): void {
    this.shouldScrollToBottom = true
  }

  /**
   * Ejecuta el scroll si está programado
   */
  executeScheduledScroll(container: ElementRef): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom(container)
      this.shouldScrollToBottom = false
    }
  }

  /**
   * Hace scroll hacia abajo inmediatamente
   */
  scrollToBottom(container: ElementRef): void {
    try {
      if (container?.nativeElement) {
        const element = container.nativeElement
        element.scrollTop = element.scrollHeight
      }
    } catch (err) {
      console.warn("Error al hacer scroll:", err)
    }
  }

  /**
   * Hace scroll al fondo usando requestAnimationFrame por varias frames para cubrir renders asíncronos (p.ej., Markdown)
   */
  scrollToBottomRaf(container: ElementRef, frames = 3): void {
    try {
      if (!container?.nativeElement) return
      const el = container.nativeElement as HTMLElement
      let i = 0
      const tick = () => {
        try { el.scrollTop = el.scrollHeight } catch {}
        if (++i < frames) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch (err) {
      console.warn("Error al hacer scroll rAF:", err)
    }
  }

  /**
   * Scroll suave hacia el fondo (para acciones del usuario, no para streaming)
   */
  scrollToBottomSmooth(container: ElementRef): void {
    try {
      if (!container?.nativeElement) return
      const el = container.nativeElement as HTMLElement
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } catch (err) {
      console.warn("Error al hacer scroll suave:", err)
    }
  }

  /** Comprueba si el usuario está cerca del final */
  isNearBottom(container: ElementRef, threshold = 160): boolean {
    try {
      if (!container?.nativeElement) return false
      const el = container.nativeElement as HTMLElement
      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight)
      return distance <= threshold
    } catch {
      return false
    }
  }

  /**
   * Verifica si hay scroll programado
   */
  hasScheduledScroll(): boolean {
    return this.shouldScrollToBottom
  }

  /**
   * Cancela el scroll programado
   */
  cancelScheduledScroll(): void {
    this.shouldScrollToBottom = false
  }
}
