
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, Message, VoiceName } from './types';
import { base64ToUint8Array, decodeAudioData, createPcmBlob, mergeBuffers, createWavFile, sliceAudioBuffer } from './utils/audioUtils';
import Visualizer from './components/Visualizer';
import { generatePersonalities, Personality } from './utils/personalityGenerator';
import { STORY_LIBRARY } from './utils/storyData';
import { extractTextFromPdf } from './utils/pdfUtils';
import { generateSpeech, rewriteAsJournalist, createPersonaFromDescription, generateScriptFromText, generateScriptFromUrl, GeneratedPersona } from './services/geminiService';

// --- Assets ---
const AVATAR_BASE = "https://api.dicebear.com/7.x/notionists/svg?seed="; 

// --- Load Personalities ---
const ALL_VOICES = generatePersonalities();

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcripts, setTranscripts] = useState<Message[]>([]);
  
  // Selection State
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<string>(ALL_VOICES[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'chat' | 'studio' | 'receptionist'>('studio');

  // Studio State
  const [studioBlocks, setStudioBlocks] = useState<AudioBlock[]>([]);
  const [rawTextInput, setRawTextInput] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentlyPlayingBlockId, setCurrentlyPlayingBlockId] = useState<string | null>(null);
  
  // Preview Voice State
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const voicePreviewCache = useRef<Map<string, string>>(new Map());

  // AI Logic State
  const [isRewriting, setIsRewriting] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'link'>('text');
  const [urlInput, setUrlInput] = useState('');
  const [targetDuration, setTargetDuration] = useState(3); 
  
  const [usageStats, setUsageStats] = useState({ inputChars: 0, outputSeconds: 0, requestCount: 0 });
  const [rightSidebarTab, setRightSidebarTab] = useState<'stats' | 'history'>('stats');

  // Refs
  const studioAudioContextRef = useRef<AudioContext | null>(null);
  const studioAnalyserRef = useRef<AnalyserNode | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isPlayingSequenceRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Subcategories based on selection
  const subCategories = useMemo(() => {
    const subs = new Set<string>();
    ALL_VOICES.forEach(v => {
      if (selectedCategory === 'all' || v.category === selectedCategory) {
        subs.add(v.subCategory);
      }
    });
    return Array.from(subs);
  }, [selectedCategory]);

  // Filter voices
  const filteredVoices = useMemo(() => {
    return ALL_VOICES.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSub = selectedSubCategory === 'all' || p.subCategory === selectedSubCategory;
        return matchesSearch && matchesCategory && matchesSub;
    });
  }, [searchTerm, selectedCategory, selectedSubCategory]);

  const currentPersonality = ALL_VOICES.find(p => p.id === selectedPersonalityId) || ALL_VOICES[0];

  const estimatedStats = useMemo(() => {
    const text = studioBlocks.length > 0 ? studioBlocks.map(b => b.text).join(' ') : rawTextInput;
    if (!text.trim()) return { chars: 0, estimatedSeconds: 0 };
    const wordCount = text.trim().split(/\s+/).length;
    return { chars: text.length, estimatedSeconds: (wordCount * 0.4) / playbackSpeed };
  }, [studioBlocks, rawTextInput, playbackSpeed]);

  const initStudioAudio = () => {
    if (!studioAudioContextRef.current) {
      studioAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      studioAnalyserRef.current = studioAudioContextRef.current.createAnalyser();
    }
    return studioAudioContextRef.current;
  };

  const stopStudioPlayback = () => {
    isPlayingSequenceRef.current = false;
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) {}
      activeSourceRef.current = null;
    }
    setCurrentlyPlayingBlockId(null);
  };

  const handlePreviewVoice = async (e: React.MouseEvent, p: Personality) => {
    e.stopPropagation();
    if (playingPreviewId === p.id) {
        previewAudioRef.current?.pause();
        setPlayingPreviewId(null);
        return;
    }
    stopStudioPlayback();
    if (previewAudioRef.current) previewAudioRef.current.pause();

    try {
        setLoadingPreviewId(p.id);
        let audioUrl = voicePreviewCache.current.get(p.id);
        if (!audioUrl) {
            // FIX: Use the specific thematic script assigned to each personality
            const previewText = p.previewScript;
            const base64 = await generateSpeech(previewText, p.voiceId as any);
            const buffer = await decodeAudioData(base64ToUint8Array(base64), new AudioContext(), 24000);
            audioUrl = URL.createObjectURL(createWavFile(buffer.getChannelData(0), 24000));
            voicePreviewCache.current.set(p.id, audioUrl);
        }
        const audio = new Audio(audioUrl);
        previewAudioRef.current = audio;
        audio.onplay = () => { setLoadingPreviewId(null); setPlayingPreviewId(p.id); };
        audio.onended = () => setPlayingPreviewId(null);
        await audio.play();
    } catch (error) {
        setLoadingPreviewId(null);
    }
  };

  const handleAiRewriteScript = async () => {
    setIsRewriting(true);
    try {
      let script = inputMode === 'text' ? await generateScriptFromText(rawTextInput) : await generateScriptFromUrl(urlInput, targetDuration);
      if (inputMode === 'link') setInputMode('text');
      setRawTextInput(script);
    } catch (e) { alert("Lỗi AI"); }
    finally { setIsRewriting(false); }
  };

  const handleParseAndGenerate = async () => {
    if (!rawTextInput.trim()) return;
    const lines = rawTextInput.split(/\n+/).filter(l => l.trim().length > 0);
    const newBlocks: any[] = lines.map(line => {
        const match = line.match(/^([A-Za-zÀ-ỹ\s]+):\s*(.+)$/);
        return {
            id: Math.random().toString(36).substr(2, 9),
            text: match ? match[2] : line,
            voiceId: selectedPersonalityId,
            isGenerating: true,
            audioUrl: null, audioBuffer: null, duration: 0
        };
    });
    setStudioBlocks(newBlocks);
    setRawTextInput('');
    for (const b of newBlocks) await generateBlockAudio(b.id, b.text, b.voiceId);
  };

  const generateBlockAudio = async (blockId: string, text: string, vId: string) => {
    const persona = ALL_VOICES.find(p => p.id === vId) || currentPersonality;
    setStudioBlocks(prev => prev.map(b => b.id === blockId ? { ...b, voiceId: vId, isGenerating: true, error: undefined } : b));

    try {
      const base64 = await generateSpeech(text, persona.voiceId as any);
      const ctx = initStudioAudio();
      const buffer = await decodeAudioData(base64ToUint8Array(base64), ctx, 24000);
      const url = URL.createObjectURL(createWavFile(buffer.getChannelData(0), 24000));
      setStudioBlocks(prev => prev.map(b => b.id === blockId ? { ...b, voiceId: vId, audioUrl: url, audioBuffer: buffer, isGenerating: false, duration: buffer.duration } : b));
    } catch (e) {
      setStudioBlocks(prev => prev.map(b => b.id === blockId ? { ...b, voiceId: vId, isGenerating: false, error: "Lỗi" } : b));
    }
  };

  const handleChangeBlockVoice = (blockId: string, vId: string) => {
    const block = studioBlocks.find(b => b.id === blockId);
    if (block) {
      generateBlockAudio(blockId, block.text, vId);
    }
  };

  const playBlockSequence = async (startIndex = 0) => {
    const ctx = initStudioAudio();
    stopStudioPlayback();
    isPlayingSequenceRef.current = true;
    const playNext = (index: number) => {
      if (!isPlayingSequenceRef.current || index >= studioBlocks.length) { setCurrentlyPlayingBlockId(null); return; }
      const block = studioBlocks[index];
      if (!block.audioBuffer) { playNext(index + 1); return; }
      setCurrentlyPlayingBlockId(block.id);
      const source = ctx.createBufferSource();
      source.buffer = block.audioBuffer;
      source.playbackRate.value = playbackSpeed;
      source.connect(studioAnalyserRef.current!);
      studioAnalyserRef.current!.connect(ctx.destination);
      source.onended = () => isPlayingSequenceRef.current && playNext(index + 1);
      activeSourceRef.current = source;
      source.start();
    };
    playNext(startIndex);
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-300 flex flex-col font-sans overflow-hidden">
      <header className="h-16 border-b border-white/5 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">V</div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase">VinaTales <span className="font-light text-indigo-400">Studio</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">AI Voice Engine v2.5</p>
          </div>
        </div>
        <nav className="flex bg-slate-950/80 p-1 rounded-full border border-white/5">
           {['chat', 'receptionist', 'studio'].map((tab) => (
             <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{tab}</button>
           ))}
        </nav>
        <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] text-indigo-400 font-black uppercase tracking-tighter animate-pulse">Professional Mode</div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR: EXPANDED VOICE LIBRARY */}
        <div className="w-80 bg-slate-900/60 border-r border-white/5 flex flex-col z-10 backdrop-blur-xl shadow-2xl">
             <div className="p-4 space-y-3 bg-slate-900/40">
                <input type="text" placeholder="Tìm kiếm trong 250+ giọng..." className="w-full bg-slate-950/50 border border-white/10 rounded-lg py-2 px-4 text-xs text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                
                {/* Category Chips */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {['all', 'news', 'story', 'podcast', 'humor', 'relax'].map(cat => (
                        <button key={cat} onClick={() => { setSelectedCategory(cat); setSelectedSubCategory('all'); }} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-500 hover:bg-slate-700'}`}>
                            {cat === 'all' ? 'Tất cả' : cat}
                        </button>
                    ))}
                </div>

                {/* Subcategory Selector */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 border-t border-white/5 pt-2">
                    <button onClick={() => setSelectedSubCategory('all')} className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase whitespace-nowrap border ${selectedSubCategory === 'all' ? 'bg-slate-200 text-slate-900' : 'bg-slate-950 text-slate-500 border-white/5'}`}>Lĩnh Vực</button>
                    {subCategories.map(sub => (
                        <button key={sub} onClick={() => setSelectedSubCategory(sub)} className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase whitespace-nowrap border transition-all ${selectedSubCategory === sub ? 'bg-indigo-400/20 border-indigo-400 text-indigo-300' : 'bg-slate-950 text-slate-600 border-white/5 hover:border-white/20'}`}>
                            {sub}
                        </button>
                    ))}
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredVoices.map(p => (
                  <div key={p.id} onClick={() => setSelectedPersonalityId(p.id)} className={`group w-full flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${selectedPersonalityId === p.id ? 'bg-indigo-600/10 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                    <div className="relative shrink-0">
                        <img src={`${AVATAR_BASE}${p.id}`} className="w-11 h-11 rounded-lg bg-slate-800 shadow-lg border border-white/5" />
                        <button onClick={(e) => handlePreviewVoice(e, p)} className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg ${playingPreviewId === p.id ? 'opacity-100 bg-indigo-600/40' : ''}`}>
                            {loadingPreviewId === p.id ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : playingPreviewId === p.id ? (
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                        </button>
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className={`font-bold text-[11px] truncate ${selectedPersonalityId === p.id ? 'text-white' : 'text-slate-300'}`}>{p.name}</div>
                      <div className="text-[9px] text-slate-500 font-medium truncate mt-0.5 uppercase tracking-tighter opacity-80">{p.subCategory} • {p.description.split('.')[0]}</div>
                    </div>
                  </div>
                ))}
             </div>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 flex flex-col relative bg-slate-950">
            <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-slate-900/40 z-10 backdrop-blur-md">
               <div className="flex items-center gap-4">
                   <img src={`${AVATAR_BASE}${selectedPersonalityId}`} className="w-9 h-9 rounded-lg border border-white/10 shadow-xl" />
                   <div>
                       <h2 className="text-sm font-black text-white uppercase tracking-tight leading-none">{currentPersonality.name}</h2>
                       <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{currentPersonality.category} / {currentPersonality.subCategory}</span>
                   </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Playback Speed: {playbackSpeed}x</span>
                      <input type="range" min="0.5" max="2.0" step="0.1" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col">
               {activeTab === 'studio' ? (
                 <div className="flex flex-col h-full">
                    {studioBlocks.length === 0 ? (
                        <div className="flex-1 p-6 flex flex-col gap-6 max-w-5xl mx-auto w-full overflow-y-auto custom-scrollbar">
                            <div className="flex gap-8 border-b border-white/5 pb-0 shrink-0">
                                <button onClick={() => setInputMode('text')} className={`text-xs font-black uppercase pb-4 px-2 transition-all ${inputMode === 'text' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}>Soạn Thảo Tự Do</button>
                                <button onClick={() => setInputMode('link')} className={`text-xs font-black uppercase pb-4 px-2 transition-all ${inputMode === 'link' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}>✨ Biến Hóa Từ Link Báo</button>
                            </div>

                            <div className="flex-1 flex flex-col gap-4">
                                {inputMode === 'link' ? (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-indigo-500/[0.01] border border-white/5 rounded-[2.5rem] p-10 gap-8 shadow-inner">
                                        <div className="text-center max-w-xl">
                                            <div className="w-20 h-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-indigo-400 shadow-2xl border border-indigo-500/20 transform rotate-3">
                                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                            </div>
                                            <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase">Podcast Engine Pro</h3>
                                            <p className="text-sm text-slate-500 leading-relaxed font-medium px-6">Dán đường dẫn tin tức bất kỳ. AI sẽ tự đọc hiểu, bổ sung dữ liệu thực tế từ web và viết thành kịch bản đối thoại đa nhân vật với thời lượng cực kỳ chính xác.</p>
                                        </div>
                                        
                                        <div className="w-full max-w-lg space-y-6">
                                            <input type="text" placeholder="Dán link bài báo của bạn vào đây..." className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all shadow-2xl" value={urlInput} onChange={e => setUrlInput(e.target.value)} />
                                            
                                            <div className="bg-slate-900/60 p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Thời lượng Podcast:</span>
                                                    <span className="bg-indigo-600 text-white px-5 py-1.5 rounded-full text-sm font-black shadow-lg">{targetDuration} phút</span>
                                                </div>
                                                <input type="range" min="1" max="60" step="1" value={targetDuration} onChange={e => setTargetDuration(parseInt(e.target.value))} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                                <div className="flex justify-between text-[10px] text-slate-700 font-black uppercase tracking-widest">
                                                    <span>Min</span>
                                                    <span>30m</span>
                                                    <span>Max</span>
                                                </div>
                                            </div>

                                            <button onClick={handleAiRewriteScript} disabled={!urlInput.trim() || isRewriting} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-30 text-white font-black text-xl py-6 rounded-[2rem] shadow-2xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-4 active:scale-95">
                                                {isRewriting ? <div className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : 'BẮT ĐẦU BIÊN TẬP'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-white/5 shadow-xl">
                                            <div className="flex gap-3">
                                                <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border border-white/5">TẢI FILE PDF/TEXT</button>
                                                <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
                                                    const f = e.target.files?.[0];
                                                    if(f) setRawTextInput(await extractTextFromPdf(f));
                                                }} />
                                                <button onClick={handleAiRewriteScript} disabled={!rawTextInput.trim() || isRewriting} className="bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter border border-indigo-500/20 transition-all flex items-center gap-2">
                                                    {isRewriting ? 'ĐANG BIÊN TẬP...' : '✨ AI TỰ TẠO KỊCH BẢN'}
                                                </button>
                                            </div>
                                            <button onClick={() => setRawTextInput('')} className="text-[10px] font-black text-slate-600 hover:text-red-500 px-4 transition-colors uppercase tracking-widest">Xóa tất cả</button>
                                        </div>
                                        <textarea className="flex-1 w-full bg-slate-900/20 border border-white/5 rounded-3xl p-10 text-xl text-slate-200 outline-none focus:border-indigo-500/20 resize-none font-serif leading-relaxed shadow-inner custom-scrollbar" placeholder="Dán văn bản của bạn tại đây...\n\nHoặc viết theo định dạng:\nHost: Xin chào...\nChuyên gia: Chào các bạn..." value={rawTextInput} onChange={e => setRawTextInput(e.target.value)} />
                                    </>
                                )}
                            </div>
                            
                            {inputMode === 'text' && (
                                <div className="flex justify-center pb-8 pt-4">
                                    <button onClick={handleParseAndGenerate} disabled={!rawTextInput.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-14 py-5 rounded-full font-black text-xl shadow-2xl shadow-indigo-900/40 flex items-center gap-4 transition-all transform hover:scale-105 active:scale-95 uppercase tracking-tighter">Tạo Audio Đa Nhân Vật</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* TIMELINE VIEW */
                        <div className="flex-1 flex flex-col h-full bg-slate-950">
                            <div className="h-14 bg-slate-900/80 border-b border-white/5 flex items-center px-6 justify-between shrink-0 backdrop-blur-md">
                                <div className="flex items-center gap-6">
                                    <button onClick={() => { setStudioBlocks([]); setCurrentlyPlayingBlockId(null); }} className="text-[10px] font-black text-slate-500 hover:text-white flex items-center gap-2 uppercase tracking-widest transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                        Quay lại
                                    </button>
                                    <div className="h-6 w-px bg-white/5"></div>
                                    <button onClick={() => playBlockSequence()} className="flex items-center gap-3 bg-white hover:bg-slate-200 text-slate-950 px-8 py-2 rounded-full text-xs font-black uppercase shadow-2xl transition-all active:scale-95">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        Phát toàn bộ
                                    </button>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] bg-slate-950/50 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                                        {studioBlocks.length} Blocks • {Math.floor(studioBlocks.reduce((acc,b) => acc + b.duration, 0))}s Total
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-950">
                                {studioBlocks.map((block, idx) => {
                                    const bPersona = ALL_VOICES.find(p => p.id === block.voiceId) || currentPersonality;
                                    return (
                                        <div key={block.id} className={`group relative bg-slate-900/20 border-2 ${currentlyPlayingBlockId === block.id ? 'border-indigo-500 bg-indigo-900/5 shadow-[0_0_30px_rgba(99,102,241,0.05)]' : 'border-white/[0.03] hover:border-white/10'} rounded-[2rem] p-6 transition-all duration-500`}>
                                            <div className="flex gap-6 items-start">
                                                <div className="flex flex-col items-center gap-4">
                                                    <span className="text-[10px] font-black font-mono text-slate-800 bg-slate-900 w-10 h-10 flex items-center justify-center rounded-2xl border border-white/5">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                                                    <button onClick={() => currentlyPlayingBlockId === block.id ? stopStudioPlayback() : playBlockSequence(idx)} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all ${currentlyPlayingBlockId === block.id ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                                        {currentlyPlayingBlockId === block.id ? (
                                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                                                        ) : (
                                                            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="flex flex-col items-center gap-2">
                                                    <img src={`${AVATAR_BASE}${bPersona.id}`} className="w-16 h-16 rounded-2xl border-2 border-white/5 group-hover:border-indigo-500/40 transition-all duration-700 shadow-2xl" />
                                                    <select value={block.voiceId} onChange={(e) => handleChangeBlockVoice(block.id, e.target.value)} className="bg-slate-900/80 rounded-lg px-2 py-1 text-[8px] text-indigo-400 uppercase font-black outline-none border border-white/5 w-28 text-center cursor-pointer hover:bg-slate-800 transition-colors shadow-lg">
                                                        {ALL_VOICES.slice(0, 100).map(p => <option key={p.id} value={p.id} className="bg-slate-950">{p.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <textarea value={block.text} onChange={(e) => setStudioBlocks(prev => prev.map(b => b.id === block.id ? { ...b, text: e.target.value } : b))} className="w-full bg-transparent text-lg text-slate-300 outline-none resize-none font-serif leading-relaxed placeholder-slate-800" rows={Math.max(1, Math.ceil(block.text.length / 80))} />
                                                    <div className="flex items-center justify-between border-t border-white/[0.03] pt-4">
                                                        <div className="flex items-center gap-4">
                                                            {block.isGenerating ? (
                                                                <span className="text-[9px] font-black uppercase text-indigo-500 animate-pulse flex items-center gap-3">
                                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                                                                    Processing AI Voice...
                                                                </span>
                                                            ) : block.error ? (
                                                                <span className="text-[9px] font-black uppercase text-red-500 tracking-widest">{block.error}</span>
                                                            ) : (
                                                                <span className="text-[10px] font-black font-mono text-slate-700 bg-slate-900/50 px-3 py-1 rounded-full uppercase tracking-tighter border border-white/[0.03]">Time: {block.duration.toFixed(1)}s</span>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => generateBlockAudio(block.id, block.text, block.voiceId)} className="text-[9px] font-black uppercase text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 active:scale-95">
                                                                Regenerate
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="h-32"></div>
                            </div>
                            {/* Visualizer Footer Area */}
                            <div className="h-12 bg-indigo-600 flex items-center justify-center overflow-hidden relative shadow-[0_-10px_50px_rgba(99,102,241,0.3)]">
                                <Visualizer isActive={currentlyPlayingBlockId !== null} analyser={studioAnalyserRef.current} color="#ffffff" />
                                {currentlyPlayingBlockId && (
                                    <div className="absolute left-10 text-[10px] font-black text-white uppercase tracking-[0.3em] drop-shadow-2xl animate-pulse">
                                        Recording Block {studioBlocks.findIndex(b => b.id === currentlyPlayingBlockId) + 1}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                 </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center p-12 bg-slate-950">
                     <div className="max-w-2xl text-center space-y-10 bg-slate-900/30 p-20 rounded-[4rem] border border-white/[0.03] shadow-2xl backdrop-blur-3xl">
                        <div className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center mx-auto text-white shadow-[0_20px_50px_rgba(99,102,241,0.4)] transform rotate-6 hover:rotate-0 transition-transform duration-700">
                            <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                          <h3 className="text-4xl font-black text-white mb-6 tracking-tighter uppercase">Hệ Thống Đang Nâng Cấp</h3>
                          <p className="text-slate-500 text-xl leading-relaxed font-medium px-10">Chúng tôi đang cấu hình lại kho giọng đọc khổng lồ cho chế độ Live Chat. Vui lòng sử dụng <span className="text-indigo-400 font-black">TTS STUDIO</span> để trải nghiệm 250+ nhân cách AI ngay bây giờ.</p>
                        </div>
                        <button onClick={() => setActiveTab('studio')} className="px-14 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-3xl shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 uppercase tracking-widest text-sm">TRẢI NGHIỆM STUDIO PRO</button>
                     </div>
                 </div>
               )}
            </div>
        </div>

        {/* RIGHT SIDEBAR: STATS & HISTORY */}
        <div className="w-80 bg-slate-950 border-l border-white/5 flex flex-col z-10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
            <div className="h-12 flex border-b border-white/5 bg-slate-900/30">
                <button onClick={() => setRightSidebarTab('stats')} className={`flex-1 text-[10px] font-black uppercase tracking-widest transition-all ${rightSidebarTab === 'stats' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/[0.03]' : 'text-slate-600 hover:text-slate-400'}`}>Số Liệu</button>
                <button onClick={() => setRightSidebarTab('history')} className={`flex-1 text-[10px] font-black uppercase tracking-widest transition-all ${rightSidebarTab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/[0.03]' : 'text-slate-600 hover:text-slate-400'}`}>Thư Viện</button>
            </div>
            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="bg-gradient-to-br from-indigo-900/10 to-slate-900/40 p-8 rounded-[2rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16"></div>
                    <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6">Dự Tính Hiện Tại</h4>
                    <div className="space-y-6">
                        <div className="flex justify-between items-baseline"><span className="text-slate-500 text-[10px] font-black uppercase tracking-tighter">Tổng Ký Tự</span><span className="text-white font-mono text-2xl font-light">{estimatedStats.chars.toLocaleString()}</span></div>
                        <div className="flex justify-between items-baseline"><span className="text-slate-500 text-[10px] font-black uppercase tracking-tighter">Thời Lượng</span><span className="text-white font-mono text-2xl font-light">~{estimatedStats.estimatedSeconds.toFixed(1)}s</span></div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] px-2">Phiên Làm Việc</h4>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 shadow-inner flex justify-between items-center group">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Dữ liệu đầu vào</p>
                                <p className="font-mono text-white text-lg">{usageStats.inputChars.toLocaleString()} <span className="text-[10px] text-slate-600">Chars</span></p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 group-hover:text-indigo-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 shadow-inner flex justify-between items-center group">
                            <div>
                                <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Thời lượng đầu ra</p>
                                <p className="font-mono text-white text-lg">{usageStats.outputSeconds.toFixed(1)} <span className="text-[10px] text-slate-600">Secs</span></p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-600 group-hover:text-purple-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

interface AudioBlock {
    id: string;
    text: string;
    voiceId: string;
    isGenerating: boolean;
    duration: number;
    error?: string;
    audioUrl: string | null;
    audioBuffer: AudioBuffer | null;
}
