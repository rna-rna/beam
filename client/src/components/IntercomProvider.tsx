
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import Intercom from '@intercom/messenger-js-sdk';

export function IntercomProvider() {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      const displayName = user.firstName || user.lastName
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : user.username || user.primaryEmailAddress?.emailAddress || 'Anonymous';

      Intercom('boot', {
        app_id: 'nddy1kg6',
        user_id: user.id,
        name: displayName,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        created_at: Math.floor(new Date(user.createdAt).getTime() / 1000),
        avatar: {
          type: 'avatar',
          image_url: user.imageUrl || ''
        },
        custom_attributes: {
          last_sign_in: Math.floor(new Date(user.lastSignInAt || user.createdAt).getTime() / 1000),
          email_verified: user.primaryEmailAddress?.verification?.status === 'verified'
        }
      });
    } else {
      Intercom('boot', {
        app_id: 'nddy1kg6'
      });
    }

    return () => {
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
    };
  }, [isSignedIn, user]);

  return null;
}
