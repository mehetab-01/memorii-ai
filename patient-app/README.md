# Memorii - Android Patient App for Alzheimer's Users

A React Native (Expo) **Android mobile app** designed specifically for Alzheimer's patients with accessibility and voice-first interaction at its core.

**Architecture:**
- 📱 **Patient App:** Android mobile app (this project)
- 🌐 **Caretaker App:** Web-based dashboard (separate project)

## 🎯 Features

### ✨ Voice-First Interface
- **AI Voice Companion**: Large, pulsing microphone button for easy voice interaction
- **Text-to-Speech**: All interactions provide voice feedback using expo-speech
- **Visual Feedback**: Clear listening states with animated indicators

### 👨‍👩‍👧 Memory Lane
- Horizontal scrollable cards showing family members
- Tap any card to hear: "This is your [relation], [name]"
- High-contrast images with large, readable text

### 🕐 Status Display
- Dynamic greeting based on time of day
- Large digital clock (64px, high-contrast)
- Current date with icon

### 🚨 Safety Features
- **Emergency SOS Button**: Full-width red button at the bottom
- **Long-press to activate**: Prevents accidental triggers
- **GPS Tracking**: Mock GPS logging every 60 seconds to console
- **Automated Alerts**: Simulates emergency contact calls

### 💊 Smart Features
- **Medication Reminders**: Auto-popup modal after 5 seconds
- **Voice Confirmations**: Speaks reminders aloud
- **Simple Actions**: Large "I Took It" and "Remind Later" buttons

## 🎨 Design Principles

### Accessibility First
- Pure black background (#000000) for maximum contrast
- Dark gray cards (#1C1C1E) with 20px rounded corners
- Large, white typography (readable at arm's length)
- Ionicons for universal symbol recognition
- No small touch targets - all buttons are oversized

### Visual Hierarchy
- Clock: 64px bold
- Greeting: 28px
- Section titles: 24px
- All text: High contrast white on black

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Pixel 7 emulator) or physical device

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npx expo start
   ```

3. **Run on Android emulator:**
   ```bash
   npm run android
   # Or press 'a' in Expo terminal
   ```

**Note:** This is an Android-only app. iOS is not supported as this is specifically built for Android patient devices.

## 📦 Dependencies

```json
{
  "expo": "~50.0.0",
  "expo-linear-gradient": "~12.7.0",
  "expo-speech": "~11.7.0",
  "@expo/vector-icons": "^14.0.0"
}
```

## 🎮 Usage

### Family Cards
- **Tap** any family member card to hear their name and relation

### Voice Companion
- **Tap** the microphone button to start listening
- **Wait** for voice feedback
- **Tap again** to stop

### Emergency Button
- **Long-press** (1 second) the red SOS button
- Voice confirmation and console logs simulate emergency protocol

### Medication Modal
- Automatically appears after 5 seconds
- Tap "I Took It" to confirm
- Tap "Remind Later" to dismiss

## 🧪 Testing on Pixel 7 Emulator

The app uses `SafeAreaView` to ensure proper display on all devices including the Pixel 7. All touch targets meet accessibility guidelines (minimum 44x44 points).

## 🏗️ Architecture

- **Single App.js**: All logic in one file for easy demo and modification
- **StyleSheet API**: Native React Native styling (no external libraries)
- **Mock Data**: Hard-coded family members for demonstration
- **Console Logging**: GPS tracking and emergency alerts log to console

## 🎯 Google AI Hackathon Ready

This app demonstrates:
- ✅ Voice-first interaction design
- ✅ Accessibility for cognitive impairments
- ✅ High-contrast, simple UI
- ✅ Safety and emergency features
- ✅ Smart reminders and notifications
- ✅ Location tracking integration (mock)

## 📝 Notes

- Avatar images use https://pravatar.cc for demo purposes
- GPS coordinates are mocked for demonstration
- Emergency calls are simulated with console logs
- Medication timings are simplified for demo (5-second trigger)

## 🔮 Future Enhancements

- Real GPS integration with background location tracking
- Actual emergency calling via `react-native-communications`
- AI voice recognition using Google Cloud Speech-to-Text
- Calendar integration for appointments
- Photo gallery with AI-powered facial recognition
- Geofencing alerts for wandering detection

## 📄 License

MIT License - Built for Google AI Hackathon 2026

---

**Built with ❤️ for Alzheimer's patients and their families**
