
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Language } from '../types';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  language?: Language;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, isListening, setIsListening, language = 'en' }) => {
  const [supported, setSupported] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    // Set language based on prop
    recognitionRef.current.lang = language === 'ru' ? 'ru-RU' : 'en-US';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: Event) => {
      console.error("Speech recognition error", event);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      if (isListening) {
        try {
            recognitionRef.current.start();
        } catch {
            setIsListening(false);
        }
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update language dynamically if it changes during lifecycle
  useEffect(() => {
    if (recognitionRef.current) {
        const wasListening = isListening;
        if (wasListening) recognitionRef.current.stop();
        recognitionRef.current.lang = language === 'ru' ? 'ru-RU' : 'en-US';
        // Note: We don't auto-restart here to prevent weird loops, user can restart if needed, 
        // or simple stop is enough.
        if (wasListening) setIsListening(false); 
    }
  }, [language]);

  const toggleListening = () => {
    if (!supported) return;

    if (isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`relative p-2 rounded-full transition-all duration-300 border ${
        isListening 
          ? 'bg-red-500/20 border-red-500 text-red-200' 
          : 'bg-white/5 border-white/10 text-stone-400 hover:bg-white/10 hover:text-white'
      }`}
      title={isListening ? "Stop Recording" : "Start Voice Recording"}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></span>
      )}
      {isListening ? <MicOff className="w-4 h-4 relative z-10" /> : <Mic className="w-4 h-4 relative z-10" />}
    </button>
  );
};

export default VoiceInput;
