
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import Intercom from '@intercom/messenger-js-sdk';

export function IntercomProvider() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      Intercom({
        app_id: 'nddy1kg6',
        user_id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.primaryEmailAddress?.emailAddress,
        created_at: Math.floor(new Date(user.createdAt).getTime() / 1000),
      });
    }
    
    return () => {
      // Cleanup Intercom on unmount
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
    };
  }, [user, isSignedIn]);

  return null;
}
