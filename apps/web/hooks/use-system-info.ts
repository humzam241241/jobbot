import { useState, useCallback } from 'react';
import debugLogger from '@/lib/utils/debug-logger';

export function useSystemInfo() {
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  const toggleSystemInfo = useCallback(() => {
    setShowSystemInfo(prev => {
      const newValue = !prev;
      debugLogger.debug('System info toggled', { 
        component: 'SystemInfo', 
        data: { visible: newValue } 
      });
      if (newValue) {
        debugLogger.enableDebugMode();
      }
      return newValue;
    });
  }, []);

  return {
    showSystemInfo,
    toggleSystemInfo
  };
}
