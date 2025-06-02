import { useState, useEffect, useRef } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import PadGrid from "@/components/DrumMachine/PadGrid";
import Transport from "@/components/DrumMachine/Transport";
import Sequencer from "@/components/DrumMachine/Sequencer";
import SampleProcessor from "@/components/DrumMachine/SampleProcessor";
import KitSelector from "@/components/DrumMachine/KitSelector";
import PatternControls from "@/components/DrumMachine/PatternControls";
import ChopBlock from "@/components/DrumMachine/ChopBlock";
import MidiGrid from "@/components/DrumMachine/MidiGrid";
import { useDrumMachineStore } from "@/lib/stores/useDrumMachine";
import { setupAudioContext } from "@/lib/audio";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Menu, X, Settings, Sliders, Save, Library, Play, Pause, Archive, RefreshCw, Volume2, VolumeX, Scissors, Grid } from 'lucide-react';
import "@fontsource/inter";

// Main App component
function App() {
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const { 
    initSamples,
    transport,
    startPlayback,
    stopPlayback,
    isRecording,
    isOverdubbing,
    isMetronomeEnabled,
    toggleRecording,
    toggleOverdub,
    toggleMetronome
  } = useDrumMachineStore();
  // Check if mobile device
  const isMobile = useIsMobile();
  
  // State for drawer panels
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  
  // Initialize audio on first user interaction
  const initializeAudio = () => {
    if (!isAudioInitialized) {
      console.log("Initializing audio context...");
      setupAudioContext();
      initSamples();
      setIsAudioInitialized(true);
      
      // Remove event listeners after initialization
      document.removeEventListener('click', initializeAudio);
      document.removeEventListener('keydown', initializeAudio);
    }
  };

  // Add event listeners for first interaction
  useEffect(() => {
    document.addEventListener('click', initializeAudio);
    document.addEventListener('keydown', initializeAudio);
    
    return () => {
      document.removeEventListener('click', initializeAudio);
      document.removeEventListener('keydown', initializeAudio);
    };
  }, [isAudioInitialized]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-red-900 text-white overflow-x-hidden" style={{ backgroundColor: '#770000' }}>
        {!isAudioInitialized && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="bg-red-800 p-8 rounded-lg max-w-md text-center border-2 border-red-600">
              <h2 className="text-2xl font-bold mb-4">MPC Drum Machine</h2>
              <p className="mb-6">Click or press any key to initialize audio</p>
              <button 
                className="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                onClick={initializeAudio}
              >
                Start
              </button>
            </div>
          </div>
        )}
        
        <div className="w-full h-screen p-4 flex flex-col">
          <header className="flex justify-between items-center h-16 z-30 relative">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">MPC ONE+</h1>
          </header>
          
          {/* Main drum pad grid taking up full screen */}
          <div className="w-full flex-grow relative">
            <div className="absolute inset-0 rounded-lg overflow-hidden shadow-lg border-2 border-red-700" style={{ touchAction: 'none', backgroundColor: '#770000' }}>
              <Canvas
                camera={{ position: [0, 1, isMobile ? 11 : 10], fov: 45 }}
                gl={{ antialias: true, alpha: false }}
              >
                <color attach="background" args={["#770000"]} /> {/* Updated to match our new red color */}
                <ambientLight intensity={1.2} /> {/* Increased ambient light to better show the pad colors */}
                <directionalLight position={[0, 5, 10]} intensity={0.8} /> {/* Adjusted direction for more even lighting */}
                <directionalLight position={[-5, -5, 5]} intensity={0.3} color="#ffffff" /> {/* Fill light from below */}
                <Suspense fallback={null}>
                  <PadGrid />
                </Suspense>
              </Canvas>
              
              {/* MPC Transport Controls - Fixed at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-red-950 bg-opacity-90 py-2 px-4 z-30 border-t-2 border-red-700">
                <div className="grid grid-cols-5 gap-2">
                  {/* MPC-style BPM Display & Metronome Toggle */}
                  <div 
                    className={`${useDrumMachineStore.getState().isMetronomeEnabled ? 'bg-orange-600' : 'bg-zinc-800'} border-2 border-zinc-700 rounded-md p-2 col-span-2 flex flex-col items-center justify-center cursor-pointer`}
                    onClick={() => useDrumMachineStore.getState().toggleMetronome()}
                  >
                    <div className="text-xs uppercase font-semibold">Tempo</div>
                    <div className="text-2xl font-mono font-bold tracking-widest">{useDrumMachineStore.getState().transport.tempo}</div>
                    <div className="text-xs uppercase font-semibold flex items-center gap-1">
                      {useDrumMachineStore.getState().isMetronomeEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      <span>Metro {useDrumMachineStore.getState().isMetronomeEnabled ? 'ON' : 'OFF'}</span>
                    </div>
                  </div>

                  {/* Transport Controls */}
                  <div className="col-span-3 flex justify-between items-center">
                    {/* Play/Stop button */}
                    <button
                      onClick={useDrumMachineStore.getState().transport.playing ? 
                        () => useDrumMachineStore.getState().stopPlayback() : 
                        () => useDrumMachineStore.getState().startPlayback()}
                      className={`h-14 w-14 ${useDrumMachineStore.getState().transport.playing ? 'bg-yellow-600' : 'bg-red-600'} hover:bg-red-700 rounded-full flex items-center justify-center border-2 ${useDrumMachineStore.getState().transport.playing ? 'border-white' : 'border-red-800'} shadow-lg`}
                    >
                      {useDrumMachineStore.getState().transport.playing ? <Pause size={24} /> : <Play size={24} />}
                    </button>
                    
                    {/* Record button */}
                    <button
                      onClick={() => useDrumMachineStore.getState().toggleRecording()}
                      className={`h-14 w-14 ${useDrumMachineStore.getState().isRecording ? 'bg-red-500 border-white' : 'bg-red-950 border-red-700'} hover:bg-red-800 rounded-full flex items-center justify-center border-2 shadow-lg`}
                    >
                      <Archive size={24} className={useDrumMachineStore.getState().isRecording ? "animate-pulse" : ""} />
                    </button>
                    
                    {/* Overdub button */}
                    <button
                      onClick={() => useDrumMachineStore.getState().toggleOverdub()}
                      className={`h-14 w-14 ${useDrumMachineStore.getState().isOverdubbing ? 'bg-yellow-500 border-white' : 'bg-red-950 border-red-700'} hover:bg-red-800 rounded-full flex items-center justify-center border-2 shadow-lg`}
                    >
                      <RefreshCw size={24} className={useDrumMachineStore.getState().isOverdubbing ? "animate-pulse" : ""} />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Floating menu button */}
              <div className="absolute bottom-20 right-4 z-10">
                <button 
                  onClick={() => setShowControls(!showControls)}
                  className="bg-red-700 hover:bg-red-600 text-white rounded-full p-3 shadow-lg border-2 border-red-600"
                >
                  {showControls ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
              
              {/* Control panel buttons */}
              {showControls && (
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                  <button 
                    onClick={() => setActivePanel(activePanel === 'transport' ? null : 'transport')}
                    className={`bg-red-700 hover:bg-red-600 text-white rounded-full p-3 shadow-lg border-2 ${activePanel === 'transport' ? 'border-white' : 'border-red-600'}`}
                    title="Transport"
                  >
                    <Sliders size={24} />
                  </button>
                  <button 
                    onClick={() => setActivePanel(activePanel === 'sequencer' ? null : 'sequencer')}
                    className={`bg-red-700 hover:bg-red-600 text-white rounded-full p-3 shadow-lg border-2 ${activePanel === 'sequencer' ? 'border-white' : 'border-red-600'}`}
                    title="Sequencer"
                  >
                    <Save size={24} />
                  </button>
                  <button 
                    onClick={() => setActivePanel(activePanel === 'processor' ? null : 'processor')}
                    className={`bg-red-700 hover:bg-red-600 text-white rounded-full p-3 shadow-lg border-2 ${activePanel === 'processor' ? 'border-white' : 'border-red-600'}`}
                    title="Sample Editor"
                  >
                    <Settings size={24} />
                  </button>
                  <button 
                    onClick={() => setActivePanel(activePanel === 'library' ? null : 'library')}
                    className={`bg-red-700 hover:bg-red-600 text-white rounded-full p-3 shadow-lg border-2 ${activePanel === 'library' ? 'border-white' : 'border-red-600'}`}
                    title="Sound Library"
                  >
                    <Library size={24} />
                  </button>
                  <button 
                    onClick={() => setActivePanel(activePanel === 'chopblock' ? null : 'chopblock')}
                    className={`bg-red-700 hover:bg-red-600 text-white rounded-full p-3 shadow-lg border-2 ${activePanel === 'chopblock' ? 'border-white' : 'border-red-600'}`}
                    title="Chop Block"
                  >
                    <Scissors size={24} />
                  </button>
                  <button 
                    onClick={() => setActivePanel(activePanel === 'midiGrid' ? null : 'midiGrid')}
                    className={`bg-red-700 hover:bg-red-600 text-white rounded-full p-3 shadow-lg border-2 ${activePanel === 'midiGrid' ? 'border-white' : 'border-red-600'}`}
                    title="MIDI Grid"
                  >
                    <Grid size={24} />
                  </button>
                </div>
              )}
              
              {/* Sliding panels */}
              <div className={`absolute inset-0 bg-black/40 z-5 transition-opacity ${activePanel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
              
              {/* Transport panel */}
              <div className={`absolute bottom-0 left-0 right-0 bg-red-800 border-t-4 border-red-600 z-20 transition-transform duration-300 shadow-lg ${activePanel === 'transport' ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">Transport</h2>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="bg-red-700 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <Transport onClose={() => setActivePanel(null)} />
                </div>
              </div>
              
              {/* Sequencer panel */}
              <div className={`absolute top-0 left-0 right-0 bg-red-800 border-b-4 border-red-600 z-20 transition-transform duration-300 shadow-lg overflow-auto max-h-[80vh] ${activePanel === 'sequencer' ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">Sequencer</h2>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="bg-red-700 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <Sequencer />
                </div>
              </div>
              
              {/* Processor panel */}
              <div className={`absolute top-0 bottom-0 right-0 w-3/4 sm:w-1/2 lg:w-1/3 bg-red-800 border-l-4 border-red-600 z-20 transition-transform duration-300 shadow-lg overflow-auto ${activePanel === 'processor' ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">Sample Processor</h2>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="bg-red-700 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <SampleProcessor />
                </div>
              </div>
              
              {/* Library panel */}
              <div className={`absolute top-0 bottom-0 left-0 w-3/4 sm:w-1/2 lg:w-1/3 bg-red-800 border-r-4 border-red-600 z-20 transition-transform duration-300 shadow-lg overflow-auto ${activePanel === 'library' ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">Sound Library</h2>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="bg-red-700 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-lg mb-2">Drum Kits</h3>
                      <KitSelector />
                    </div>
                    <div>
                      <h3 className="text-lg mb-2">Patterns</h3>
                      <PatternControls />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ChopBlock panel */}
              <div className={`absolute top-0 bottom-0 right-0 w-3/4 sm:w-1/2 lg:w-1/3 bg-red-800 border-l-4 border-red-600 z-20 transition-transform duration-300 shadow-lg overflow-auto ${activePanel === 'chopblock' ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">Chop Block</h2>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="bg-red-700 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <ChopBlock />
                </div>
              </div>
              
              {/* MIDI Grid panel */}
              <div className={`absolute top-0 bottom-0 left-0 w-full sm:w-2/3 lg:w-3/4 bg-red-800 border-r-4 border-red-600 z-20 transition-transform duration-300 shadow-lg overflow-auto ${activePanel === 'midiGrid' ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">MIDI Grid</h2>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="bg-red-700 hover:bg-red-600 text-white rounded-full p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <MidiGrid onClose={() => setActivePanel(null)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
