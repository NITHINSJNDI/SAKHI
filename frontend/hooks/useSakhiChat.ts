import { useState, useEffect } from "react";

export type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
};

export function useSakhiChat(onChartUpdate: (data: any) => void, profileName?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState<boolean>(true);

  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const checkVoiceSetting = () => {
      const storedVoice = typeof window !== 'undefined' ? localStorage.getItem('sakhi_voice_enabled') : null;
      if (storedVoice !== null) {
        const enabled = storedVoice !== 'false';
        setAutoPlayVoice(enabled);
        if (!enabled && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
      }
    };

    checkVoiceSetting();

    const handleVoiceEvent = (e: any) => {
      if (e.detail && typeof e.detail.enabled === 'boolean') {
        setAutoPlayVoice(e.detail.enabled);
        if (!e.detail.enabled && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
      } else {
        checkVoiceSetting();
      }
    };

    window.addEventListener('storage', checkVoiceSetting);
    window.addEventListener('sakhi-voice-toggled', handleVoiceEvent);

    return () => {
      window.removeEventListener('storage', checkVoiceSetting);
      window.removeEventListener('sakhi-voice-toggled', handleVoiceEvent);
    };
  }, []);

  const toggleAutoPlayVoice = () => {
    setAutoPlayVoice(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sakhi_voice_enabled', next.toString());
        window.dispatchEvent(new CustomEvent('sakhi-voice-toggled', { detail: { enabled: next } }));
        if (!next && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
      }
      return next;
    });
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speakText = (text: string) => {
    // Check if voice is disabled in settings or current state
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sakhi_voice_enabled') : null;
    const isVoiceAllowed = stored !== 'false' && autoPlayVoice;
    if (!isVoiceAllowed || !("speechSynthesis" in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a feminine, soothing voice
    let selectedVoice = voices.find(v => 
      v.name.includes("Google UK English Female") || 
      v.name.includes("Samantha") || 
      v.name.includes("Tessa") ||
      v.name.includes("Victoria") ||
      v.name.includes("Zira")
    );
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.name.includes("Female"));
    }
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith("en"));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.pitch = 1.5; // Higher pitch for a soft, cute tone
    utterance.rate = 0.9; // Slower rate for a calming, gentle effect
    utterance.volume = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (prompt: string, speakReply: boolean = true) => {
    if (!prompt.trim()) return;

    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: prompt };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const effectiveName = (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || profileName;

    try {
      const res = await fetch("/api/ask-sakhi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userName: effectiveName })
      });
      
      const data = await res.json();
      
      // Add bot message
      if (data.reply) {
        setMessages(prev => [
          ...prev, 
          { id: (Date.now() + 1).toString(), role: "bot", text: data.reply }
        ]);
        if (speakReply) {
          speakText(data.reply);
        }
      }

      // If backend returned updated ML data, pass it up to refresh charts
      if (data.updatedChartData) {
        onChartUpdate(data.updatedChartData);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = "I'm having trouble connecting to my network right now. Please try again gently.";
      setMessages(prev => [
        ...prev, 
        { id: (Date.now() + 1).toString(), role: "bot", text: errorMsg }
      ]);
      if (speakReply) speakText(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, sendMessage, speakText, isSpeaking, stopSpeaking, autoPlayVoice, toggleAutoPlayVoice };
}
