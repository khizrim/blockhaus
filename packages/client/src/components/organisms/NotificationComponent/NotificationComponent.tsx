import type React from 'react';
import { useEffect } from 'react';

import type { NotificationComponentProps } from './NotificationComponent.types';

export const NotificationComponent: React.FC<NotificationComponentProps> = ({ lastLogin }) => {
  useEffect(() => {
    // Check the Notification API permission and send a notification if necessary
    const checkNotificationPermission = async (): Promise<void> => {
      if (!('Notification' in window)) {
        console.log('Этот браузер не поддерживает Notification API.');
        return;
      }

      if (Notification.permission === 'granted') {
        sendNotificationIfNeeded();
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          sendNotificationIfNeeded();
        }
      }
    };

    // Send a notification if the user has not logged in for a long time
    const sendNotificationIfNeeded = (): void => {
      const currentTime: Date = new Date();
      const lastLoginTime: Date = new Date(lastLogin); // Преобразуем строку в объект Date
      const timeSinceLastLogin: number = currentTime.getTime() - lastLoginTime.getTime();

      // If more than 7 days have passed (7 * 24 * 60 * 60 * 1000 milliseconds)
      if (timeSinceLastLogin) {
        new Notification('Возвращайтесь в игру!', {
          body: 'Вы давно не заходили в игру! Пожалуйста, вернитесь!',
        });
      }
    };

    if (lastLogin) {
      checkNotificationPermission();
    }
  }, [lastLogin]);

  return null;
};
