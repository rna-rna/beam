import { UserProfile } from '@clerk/clerk-react';

export default function Settings() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-4">Account Settings</h1>
      <UserProfile
        path="/settings"
        routing="path"
        appearance={{
          elements: {
            card: 'shadow-lg border rounded-lg p-4',
            headerTitle: 'text-2xl font-bold',
          },
          variables: {
            colorPrimary: 'hsl(var(--primary))',
            borderRadius: 'var(--radius)',
            fontSize: '16px',
          }
        }}
      />
    </div>
  );
}
