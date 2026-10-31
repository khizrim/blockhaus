export interface FullscreenToggleProps {
  children: React.ReactElement<unknown>;
}

export interface ExtendedHTMLDivElement extends HTMLDivElement {
  msRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
}

export interface ExtendedDocument extends Document {
  msExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
}
