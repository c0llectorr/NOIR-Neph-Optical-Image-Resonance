# NOIR (Neph Optical Image Resonance) - Development Overview

This document outlines the technical architecture, implementation details, and service configurations for the NOIR application.

## 1. Project Vision
NOIR is an aesthetic intelligence platform designed to translate visual narratives into sonic resonance. It bridges the gap between digital photography and musical subtext using advanced multimodal AI.

---

## 2. Tech Stack

### Frontend
- **Framework**: React 18+ (Functional Components, Hooks)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (Utility-first styling for high-performance UI)
- **Animations**: `motion` (by Framer) for fluid, physics-based transitions
- **Icons**: Lucide React
- **Typography**: 
  - **Display**: Space Grotesk / Inter (Bold, Tracking-tighter)
  - **Mono**: JetBrains Mono (Technical/Data accents)

### Backend & Infrastructure
- **Authentication**: Firebase Authentication (Google Single Sign-On)
- **Database**: Google Cloud Firestore (NoSQL Document Store)
- **Deployment**: Google Cloud Run (Containerized environment)
- **State Management**: React Context API
- **Music Playback**: Custom HTML5 Audio implementation via `MusicContext`

---

## 3. AI Implementation (The "Engine")

### Model Selection
- **Primary Model**: `gemini-1.5-flash` (via `@google/genai` TypeScript SDK)
- **Why Flash?**: High speed and low latency, critical for a responsive mobile-first experience.

### Sentiment Driving Logic
- **Visual Analysis**: The app sends a Base64 encoded image to Gemini along with a specific system prompt.
- **Decoding Mechanism**:
  1. **Visual Signal Extraction**: Analyzes attire, color dynamics, and spatial composition.
  2. **Narrative Generation**: Creates a "Sonic Scenic Story"—a poetic, 1st-person narrative of the atmosphere.
  3. **Emotional Layers**: Extracts inferred emotions (solitude, tension, joy) to drive music recommendation metrics (`vibeMatchScore`).

### Sonic Curation
- The AI acts as a "World-Class DJ" with a conceptual library of all recorded tracks.
- Recommendations are generated based on the inferred visual mood.
- **Constraints**: 10 unique recommendations per scan, matching high-level aesthetics (e.g., Ethereal, Brutalist, Retro-Futuristic).

---

## 4. API Keys & Configuration

### Environment Variables
- `GEMINI_API_KEY`: Provided by the environment, stored securely. Used for all vision-to-audio analysis.

### Firebase Integration
- **Project ID**: `nsdb-493514`
- **Firestore Instance**: Dedicated database for user profiles, like/feedback history, and saved curations.
- **Config Source**: `firebase-applet-config.json` stores the public client-side initialization keys.

---

## 5. Deployment & Persistence

### Hosting Environment
- **Platform**: Google Cloud Run.
- **Monitoring**: Real-time logging through AI Studio's development console.

### Database Architecture
- `/users`: Profile data, onboarding status, and username registry.
- `/users/{id}/curations`: History of processed images and their recommended soundtracks.
- `/usernames`: Unique index to prevent duplicate handle registration.

---

## 6. Implementation Milestones
1. **SSO Integration**: Migrated from email/password to pure Google Authentication for seamless onboarding.
2. **Identity Setup**: Two-step registration (Unique Username -> Google Sync Name verification).
3. **Onboarding Flow**: Guided atmospheric tutorial for first-time users.
4. **Resonance logic**: Refined the AI prompts to ensure high-quality, descriptive DJ notes and poetic sentiment blogs.
