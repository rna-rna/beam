
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
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        email: user.primaryEmailAddress?.emailAddress,
        created_at: Math.floor(new Date(user.createdAt).getTime() / 1000),
        custom_attributes: {
          image_url: user.imageUrl,
          username: user.username,
          last_sign_in: Math.floor(new Date(user.lastSignInAt || user.createdAt).getTime() / 1000),
          email_verified: user.primaryEmailAddress?.verification?.status === 'verified'
        }
      });
    } else {
      // Boot Intercom without user data for non-logged-in users
      Intercom({
        app_id: 'nddy1kg6'
      });
    }
    
    return () => {
      // Cleanup on unmount
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
    };
  }, [user, isSignedIn]);

  return null;
}
