import type { FC, ReactElement, RefObject } from 'react';
import { cloneElement, isValidElement } from 'react';

export interface FullscreenToggleProps {
  children: ReactElement<FullscreenChildProps>;
}

export interface FullscreenChildProps {
  toggleFullscreen: (elementRef: RefObject<ExtendedHTMLDivElement>, isFullscreen: boolean) => boolean;
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

export const FullscreenToggle: FC<FullscreenToggleProps> = ({ children }) => {
  const toggleFullscreen = (elementRef: RefObject<ExtendedHTMLDivElement>, isFullscreen: boolean): boolean => {
    const elem = elementRef.current;
    if (!isFullscreen) {
      if (elem) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else {
          return false;
        }

        return true;
      }

      return false;
    } else {
      const doc = document as ExtendedDocument;

      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else {
        return false;
      }

      return true;
    }
  };

  if (isValidElement<FullscreenChildProps>(children)) {
    return cloneElement(children, { toggleFullscreen });
  }

  return null;
};
