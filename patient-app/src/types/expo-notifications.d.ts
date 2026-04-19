// Extend expo-notifications types to include channelId
// channelId is a valid Android-only property but missing from some type definitions
import 'expo-notifications';

declare module 'expo-notifications' {
  interface NotificationContentInput {
    channelId?: string;
  }
}
