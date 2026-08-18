import { TextStyleData } from 'hugerte/plugins/onlcshared/text/TextStyle';

/**
 * Types of the ONLC media API. The wire format is documented in
 * `docs/api/onlc-media-api.md`.
 */

export interface MediaFolder {
  readonly name: string;
  readonly path: string;
  readonly count?: number;
  readonly modified?: string;
}

export interface MediaFile {
  readonly name: string;
  readonly path: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly mime?: string;
  readonly size?: number;
  readonly width?: number;
  readonly height?: number;
  readonly modified?: string;
  readonly editable?: boolean;
}

export interface MediaListing {
  readonly path: string;
  readonly parent?: string | null;
  readonly folders: MediaFolder[];
  readonly files: MediaFile[];
}

export interface MediaHandlers {
  readonly list?: (path: string) => Promise<MediaListing>;
  readonly upload?: (path: string, file: File) => Promise<MediaFile>;
  readonly createFolder?: (path: string, name: string) => Promise<MediaFolder>;
  readonly deleteFolder?: (path: string) => Promise<void>;
  readonly deleteFile?: (path: string) => Promise<void>;
  readonly move?: (sources: string[], target: string) => Promise<MediaFile[]>;
  readonly copy?: (sources: string[], target: string) => Promise<MediaFile[]>;
  readonly rename?: (path: string, name: string) => Promise<MediaFile>;
  readonly save?: (path: string, name: string, data: string) => Promise<MediaFile>;
}

export interface OverlayData {
  readonly text: string;
  readonly position: string;
  readonly fontSize: string;
  readonly fontFamily: string;
  readonly color: string;
  readonly background: string;
  readonly margin: string;
  readonly padding: string;
  /** Dégradé et ombre portée du texte (voir `onlcshared/text/TextStyle`). */
  readonly textStyle: TextStyleData;
}

export interface ImageData {
  readonly src: string;
  readonly alt: string;
  readonly title: string;
  readonly preset: string;
  readonly width: string;
  readonly customCss: string;
  readonly overlay: OverlayData;
  readonly link: {
    readonly href: string;
    readonly title: string;
    readonly target: string;
    readonly rel: string;
    readonly classes: string;
  };
}
