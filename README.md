# 🤖 AI Interview Prep App

An AI-powered interview preparation platform built with **React** that conducts realistic mock interviews entirely in the browser. The application supports both **Google Gemini Flash Lite** and **OpenAI GPT-4o**, provides real-time AI feedback, stores interview history locally, and requires **no backend**.

---

## ✨ Features

* 💯 100% Client-side application
* 🔒 Privacy-first (API keys never leave the browser)
* 🤖 AI-powered interview generation
* 💬 Interactive chat-based interview experience
* 📊 Live interview scoring and feedback
* 🎤 Voice input using Speech Recognition
* 🔊 Voice output using Speech Synthesis
* 💾 Session persistence across page reloads
* 📚 Interview history with local storage
* 📱 Fully responsive UI
* 🌙 Premium dark "Resume Intelligence" theme

---

# 🚀 Tech Stack

| Technology                          | Purpose                |
| ----------------------------------- | ---------------------- |
| React 18+                           | Frontend               |
| Tailwind CSS                        | Styling                |
| Framer Motion                       | Animations             |
| Phosphor Icons                      | Icons                  |
| Google Gemini SDK (`@google/genai`) | Gemini Integration     |
| OpenAI REST API (`fetch`)           | GPT-4o Integration     |
| sessionStorage                      | Active Interview State |
| localStorage                        | Interview History      |

---

# 🏗️ Architecture

The application follows a completely frontend-only architecture.

```
Browser
│
├── React UI
│
├── AI Service Layer
│      ├── Google Gemini
│      └── OpenAI
│
├── sessionStorage
│      ├── Active Interview
│      ├── Chat
│      ├── Feedback
│      └── API Keys
│
└── localStorage
       └── Interview History
```

No backend, database, authentication, or server-side processing is used.

---

# 📂 Project Structure

```
src/
│
├── components/
│   ├── ui/
│   ├── Header
│   └── VoiceRecorder
│
├── screens/
│   ├── InputScreen
│   ├── InterviewScreen
│   ├── ResultsScreen
│   └── HistoryScreen
│
├── services/
│   └── aiService
│
├── contexts/
│   └── ThemeContext
│
├── App
└── index.css
```

---

# 🎯 Application Flow

```
Input Screen
      │
      ▼
Generate Questions
      │
      ▼
Interview Screen
      │
      ▼
Live AI Feedback
      │
      ▼
Results Screen
      │
      ▼
History Screen
```

---

# 📄 Screens

## 1. Input Screen

The starting point of the application where users configure the interview.

### User Inputs

* Company Name
* Job Role
* Job Description
* Interview Type
* AI Provider
* API Key

### AI Features

* Automatically infers interview difficulty
* Generates interview questions
* Supports:

  * Google Gemini Flash Lite
  * OpenAI GPT-4o

---

## 2. Interview Screen

Interactive AI chat interface for conducting the interview.

### Features

* Real-time AI conversation
* Follow-up questions
* Live feedback after every answer
* Running interview score
* Font size controls
* Voice recording
* Voice playback
* Session persistence

---

## 3. Results Screen

Displays the complete interview summary.

Includes:

* Overall score
* Difficulty level
* Question-wise breakdown
* Strengths
* Areas of improvement
* Final feedback

---

## 4. History Screen

Displays all previously completed interviews stored locally.

Information includes:

* Company
* Role
* Interview Type
* Difficulty
* Score
* Date
* View Results

---

# 🤖 Supported Interview Types

* HR Round
* Technical Round
* System Design
* Behavioural Round

Each interview type generates specialized AI prompts.

---

# 🧠 AI Providers

## Google Gemini Flash Lite

* Default provider
* Uses `@google/genai`
* Supports Google Search tool
* Fast responses
* Recommended for most users

---

## OpenAI GPT-4o

* Uses direct REST API
* No SDK required
* Uses browser `fetch()`
* CORS supported

---

# 💾 Storage Strategy

## sessionStorage

Used for active interview state.

Stores:

* Current screen
* Current interview
* Chat messages
* Current question
* Live feedback
* Font size
* API key
* Selected provider

---

## localStorage

Used for completed interview history.

Stores:

* Company
* Role
* Questions
* Answers
* Feedback
* Score
* Timestamp
* AI Provider

---

# 🎨 UI & Design

Theme:

* Dark-first interface
* Premium Resume Intelligence aesthetic
* Amber accent colors
* Background grid
* Ambient blob animations
* Professional dashboard layout

Typography:

* Inter Font
* Large bold headings
* Compact uppercase labels
* Readable body text

---

# 🎤 Voice Features

### Speech Recognition

* Browser SpeechRecognition API
* Converts speech to text
* Optional feature

### Speech Synthesis

* Browser SpeechSynthesis API
* Reads AI responses aloud
* Toggle enabled/disabled

---

# 📊 Live Feedback

Every answer is analyzed immediately.

Feedback includes:

* Score
* Strengths
* Improvements
* Communication quality
* Technical depth
* Overall performance

---

# 🔒 Privacy

The application is designed with privacy as the highest priority.

* No backend
* No database
* No analytics
* No authentication
* No user tracking
* API keys remain inside the browser
* Keys stored only in sessionStorage
* Nothing is sent except AI requests

---

# ⚠️ Error Handling

The application gracefully handles:

* Invalid API Key (401)
* Rate Limit (429)
* Network failures
* Empty responses
* AI generation failures

---

# 📱 Responsive Design

Optimized for:

* Mobile (375px+)
* Tablets
* Desktop
* Large monitors

---

# ♿ Accessibility

* Keyboard navigation
* ARIA labels
* Responsive typography
* Focus indicators
* Screen reader friendly controls

---

# 🧪 Testing Checklist

* Default provider is Gemini
* Interview state survives refresh
* New interview clears previous session
* Font size preference persists
* Voice recording functions correctly
* Voice playback works
* History is stored locally
* Gemini integration works
* OpenAI integration works
* Responsive layout verified

---

# 📌 Key Highlights

* 100% client-side architecture
* Zero backend dependency
* AI-powered mock interviews
* Real-time conversation
* Live performance analysis
* Local interview history
* Voice-enabled experience
* Responsive modern UI
* Privacy-first implementation

---

# 🔮 Future Enhancements

* Export interview reports as PDF
* Resume upload and AI analysis
* Coding interview playground
* Mock coding editor
* Interview timer
* Multi-language support
* AI-generated improvement roadmap
* Analytics dashboard
* Custom interview templates
* Dark/light theme options

---

# 📄 License

This project is intended for educational and portfolio purposes. Feel free to extend and customize it for your own interview preparation workflow.

---

## ⭐ If you found this project useful, consider giving it a star!
