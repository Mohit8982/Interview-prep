import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/App.css';
import AmbientBackground from '@/components/AmbientBackground';
import Header from '@/components/Header';
import InputScreen from '@/screens/InputScreen';
import InterviewScreen from '@/screens/InterviewScreen';
import ResultsScreen from '@/screens/ResultsScreen';
import HistoryScreen from '@/screens/HistoryScreen';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <AmbientBackground />
      <BrowserRouter>
        <Header />
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<InputScreen />} />
            <Route path="/interview" element={<InterviewScreen />} />
            <Route path="/results/:sessionId" element={<ResultsScreen />} />
            <Route path="/history" element={<HistoryScreen />} />
          </Routes>
        </main>
        <footer className="relative z-10 border-t border-border/60 mt-12 py-6 text-center">
          <p className="micro-label">// 100% client-side · no analytics · keys never leave your browser</p>
        </footer>
      </BrowserRouter>
    </div>
  );
}

export default App;
