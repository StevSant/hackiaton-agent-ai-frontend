import { Injectable, signal } from '@angular/core';

export type BgStyle = 'minimal' | 'aurora' | 'bokeh';
export type Palette = 'default' | 'vaporwave' | 'cyber';

const STORAGE_BG = 'ui_bg_style';
const STORAGE_PAL = 'ui_palette';
const STORAGE_NEON = 'ui_neon_edges';
const STORAGE_PRLX = 'ui_bg_parallax';

@Injectable({ providedIn: 'root' })
export class BackgroundService {
  private _bg = signal<BgStyle>('bokeh');
  readonly bg = this._bg.asReadonly();
  private _palette = signal<Palette>('vaporwave');
  readonly palette = this._palette.asReadonly();
  private _neon = signal<boolean>(true);
  readonly neon = this._neon.asReadonly();
  private _parallax = signal<boolean>(true);
  readonly parallax = this._parallax.asReadonly();

  private raf = 0;

  init() {
    const bg = this.readLS(STORAGE_BG) as BgStyle | null;
    const pal = this.readLS(STORAGE_PAL) as Palette | null;
    const neon = this.readLS(STORAGE_NEON);
    const prlx = this.readLS(STORAGE_PRLX);

    this.setBackground(
      bg === 'minimal' || bg === 'aurora' || bg === 'bokeh' ? bg : 'bokeh',
    );
    this.setPalette(
      pal === 'vaporwave' || pal === 'cyber' || pal === 'default'
        ? pal
        : 'vaporwave',
    );
    this.setNeonEdges(neon === 'false' ? false : true);
    this.setParallax(prlx === 'false' ? false : true);
  }

  setBackground(style: BgStyle) {
    this._bg.set(style);
    this.writeLS(STORAGE_BG, style);
    this.applyBodyClasses();
  }

  setPalette(p: Palette) {
    this._palette.set(p);
    this.writeLS(STORAGE_PAL, p);
    this.applyBodyClasses();
  }

  setNeonEdges(enabled: boolean) {
    this._neon.set(enabled);
    this.writeLS(STORAGE_NEON, String(enabled));
    this.applyBodyClasses();
  }

  setParallax(enabled: boolean) {
    this._parallax.set(enabled);
    this.writeLS(STORAGE_PRLX, String(enabled));
    this.applyBodyClasses();
    this.setupParallaxListener();
  }

  private applyBodyClasses() {
    const doc = this.safeDoc();
    if (!doc) return;
    const body = doc.body;
    // background style
    body.classList.remove('bg-minimal', 'bg-aurora', 'bg-bokeh');
    body.classList.add(`bg-${this._bg()}`);
    // palette
    body.classList.remove(
      'palette-default',
      'palette-vaporwave',
      'palette-cyber',
    );
    body.classList.add(`palette-${this._palette()}`);
    // neon edges
    body.classList.toggle('neon-edges', this._neon());
    // parallax baseline vars
    if (!body.style.getPropertyValue('--bg-px')) {
      body.style.setProperty('--bg-px', '0%');
      body.style.setProperty('--bg-py', '0%');
    }
  }

  private setupParallaxListener() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('pointermove', this.onPointerMove, {
      capture: false,
    } as any);
    if (!this._parallax()) return;
    window.addEventListener('pointermove', this.onPointerMove, {
      passive: true,
    });
  }

  private onPointerMove = (ev: PointerEvent) => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      const doc = this.safeDoc();
      if (!doc) return;
      const body = doc.body;
      const { innerWidth: w, innerHeight: h } = window;
      const x = (ev.clientX / w) * 2 - 1; // -1..1
      const y = (ev.clientY / h) * 2 - 1; // -1..1
      // map to small percent shift
      const max = 2; // percent
      const px = (x * max).toFixed(2) + '%';
      const py = (y * max).toFixed(2) + '%';
      body.style.setProperty('--bg-px', px);
      body.style.setProperty('--bg-py', py);
    });
  };

  private readLS(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  }
  private writeLS(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  }
  private safeDoc(): Document | null {
    try {
      return document;
    } catch {
      return null;
    }
  }
}
