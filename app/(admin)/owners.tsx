import { Redirect } from 'expo-router';

export default function OwnersRedirect() {
  return <Redirect href="/(admin)/agents" />;
}
