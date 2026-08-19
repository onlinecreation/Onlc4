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

/**
 * Une version enregistrée d'un fichier.
 *
 * Chaque passage dans l'éditeur d'images en ajoute une plutôt que d'écraser la précédente : le
 * rédacteur peut toujours revenir à l'état d'avant. Une version compte pour un fichier dans le
 * quota — c'est ce qui empêche l'historique de grossir sans fin.
 */
export interface MediaVersion {
  readonly id: string;
  /** Date de création, au format ISO 8601. */
  readonly createdAt: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly size?: number;
  readonly width?: number;
  readonly height?: number;
  /** Intitulé donné par l'éditeur d'images (« Recadrage », « Filtre sépia »…). */
  readonly label?: string;
  /** Vraie pour la version actuellement servie. */
  readonly current?: boolean;
}

/** Métadonnées accompagnant un binaire rendu par l'éditeur d'images. */
export interface MediaMetadata {
  readonly title?: string;
  /** Dossier de destination. Absent, le fichier reste où il était. */
  readonly folder?: string;
  /** Type mime du binaire (`image/png`, `image/jpeg`…). */
  readonly format?: string;
  readonly width?: number;
  readonly height?: number;
  /** Ce qui a été fait, pour l'affichage dans l'historique. */
  readonly label?: string;
  /**
   * Ce que ce binaire remplace : le chemin du fichier, ou son adresse publique quand l'appelant
   * ne connaît que celle-ci. L'api enregistre alors une version de plus au lieu de créer un
   * fichier ; une adresse qu'elle ne reconnaît pas donne un nouveau fichier.
   */
  readonly replaces?: string;
}

/**
 * Quotas du compte, tels que l'api les rapporte.
 *
 * Ils sont demandés à chaque fois qu'ils servent — avant un envoi, après une suppression —
 * plutôt que gardés en mémoire : ils varient d'un utilisateur à l'autre et peuvent changer
 * pendant la session.
 */
export interface MediaQuota {
  /** Nombre de fichiers utilisés, versions comprises. */
  readonly files: number;
  /** Plafond du nombre de fichiers. Zéro ou absent : pas de plafond. */
  readonly maxFiles?: number;
  /** Poids maximal d'un fichier, en octets. Zéro ou absent : pas de plafond. */
  readonly maxFileSize?: number;
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
  readonly save?: (path: string, name: string, data: string, metadata?: MediaMetadata) => Promise<MediaFile>;
  readonly versions?: (path: string) => Promise<MediaVersion[]>;
  readonly restoreVersion?: (path: string, versionId: string) => Promise<MediaFile>;
  readonly quota?: () => Promise<MediaQuota>;
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
