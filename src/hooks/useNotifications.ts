import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
  requireInteraction?: boolean;
}

export const useNotifications = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    // Create a more pleasant notification sound using Web Audio API
    const createNotificationSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };
    
    audioRef.current = { play: () => Promise.resolve(createNotificationSound()) } as any;
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.play().catch((error) => {
          console.log('Could not play notification sound:', error);
        });
      }
    } catch (error) {
      console.log('Error playing notification sound:', error);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission;
  }, []);

  const showNotification = useCallback(async (options: NotificationOptions) => {
    const {
      title,
      body,
      icon = '/favicon.ico',
      tag = 'app-notification',
      silent = false,
      requireInteraction = false
    } = options;

    // Always show toast notification
    toast(title, {
      description: body,
      duration: 5000,
    });

    // Play sound if not silent
    if (!silent) {
      playNotificationSound();
    }

    // Check if we can show browser notification
    const permission = await requestPermission();
    
    if (permission === 'granted') {
      try {
        // Check if the page is visible
        const isPageVisible = document.visibilityState === 'visible';
        
        // Show browser notification if page is not visible or if requireInteraction is true
        if (!isPageVisible || requireInteraction) {
          const notification = new Notification(title, {
            body,
            icon,
            tag,
            silent: silent,
            requireInteraction: requireInteraction,
          });

          // Handle vibration for mobile devices
          if (!silent && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
          }

          // Auto-close notification after 8 seconds if not requiring interaction
          if (!requireInteraction) {
            setTimeout(() => {
              notification.close();
            }, 8000);
          }

          // Handle notification click
          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          return notification;
        }
      } catch (error) {
        console.log('Error showing browser notification:', error);
      }
    }

    return null;
  }, [playNotificationSound, requestPermission]);

  const showChatNotification = useCallback(async (senderName: string, message: string, isSupport = false) => {
    const title = isSupport ? 'Nuevo mensaje de soporte' : 'Nuevo mensaje de chat';
    const body = `${senderName}: ${message}`;
    
    return showNotification({
      title,
      body,
      tag: isSupport ? 'support-chat' : 'chat-support',
      requireInteraction: true, // Important messages should require interaction
    });
  }, [showNotification]);

  // Initialize permission request on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return {
    showNotification,
    showChatNotification,
    requestPermission,
    playNotificationSound,
    isSupported: 'Notification' in window,
  };
};