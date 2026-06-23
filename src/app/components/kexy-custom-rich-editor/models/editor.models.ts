export type EditorMode = 'design' | 'preview' | 'html';
export type Alignment = 'left' | 'center' | 'right';
export type MediaKind = 'image' | 'video';

export interface MediaBlock {
  kind: MediaKind;
  src: string;       // image: dataUrl, video: poster dataUrl
  alt: string;
  link: string;
  width: number;
  height: number;
  ratio: number;
  lockAspect: boolean;
  align: Alignment;
  fileName?: string;
}

export interface EditorState {
  mode: EditorMode;
  sourceMode: boolean;
  selectedBlock: HTMLElement | null;
  status: string;
}

export interface InsertImageOptions {
  src: string;
  alt: string;
  width: number;
  height: number;
  ratio: number;
  skipSpacer?: boolean;
}

export interface InsertVideoOptions {
  poster: string;
  fileName: string;
  alt: string;
  width: number;
  height: number;
  ratio: number;
  skipSpacer?: boolean;
  /**
   * True when the play-button circle is already drawn INTO the poster image
   * (captured frames, custom thumbnails, placeholder SVG). Baked posters carry
   * the overlay through export/preview/email; the design-only CSS `::after`
   * overlay is then suppressed so it isn't drawn twice.
   */
  overlayBaked?: boolean;
}
