import { Redirect } from 'expo-router';

// Root layout's AuthGate handles authenticated redirects.
// Unauthenticated users land here and get sent to login.
export default function Index() {
  return <Redirect href={'/(auth)/login' as any} />;
}
