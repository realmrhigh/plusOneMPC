import React, { useState, useRef, useEffect } from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { getAudioContext } from '@/lib/audio';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
// import { Input } from '@/components/ui/input'; // Input seems unused, commented out
import { Label } from '@/components/ui/label';
import { Upload, Scissors, Save, Play, Pause, Volume2, Trash2, BarChart4 } from 'lucide-react';

const ChopBlock: React.FC = () => {
  const { pads, assignSampleToPad, uploadSample } = useDrumMachineStore(); // Added uploadSample
  
  // State for the audio clip
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformPattern, setWaveformPattern] = useState<number[]>([]);
  const [masterAudioBuffer, setMasterAudioBuffer] = useState<AudioBuffer | null>(null);
  
  // State for chop markers
  const [chopPoints, setChopPoints] = useState<number[]>([]);
  const [selectedChopIndex, setSelectedChopIndex] = useState<number | null>(null);
  const [selectedPadId, setSelectedPadId] = useState<number | null>(null);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const getDefaultWaveformPattern = () => {
    const defaultPattern = [];
    for (let i = 0; i < 64; i++) {
      const value = 30 + Math.sin(i * 0.2) * 15 + Math.sin(i * 0.5) * 8;
      defaultPattern.push(Math.abs(value));
    }
    return defaultPattern;
  };

  // Initialize waveformPattern with default
  useEffect(() => {
    setWaveformPattern(getDefaultWaveformPattern());
  }, []);
  
  // Handler for uploading a new audio file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      setAudioFile(file); 
      setMasterAudioBuffer(null); 
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      setAudioUrl(null); 
      audioUrlRef.current = null;

      setChopPoints([]);
      setSelectedChopIndex(null);
      setDuration(0);
      setCurrentTime(0);

      // Waveform pattern generation (existing logic can be kept here)
      const wavePattern = [];
      for (let i = 0; i < 64; i++) {
        const hash = (file.name.length + i) * 13;
        const value = 20 + Math.sin(i * 0.2 + hash) * 10 + Math.sin(i * 0.5) * 15 + Math.cos(i * 0.1) * 10;
        wavePattern.push(Math.abs(value));
      }
      setWaveformPattern(wavePattern);

      const newObjectUrl = URL.createObjectURL(file);
      setAudioUrl(newObjectUrl); // Set for the <audio> element src
      audioUrlRef.current = newObjectUrl; // Keep track for cleanup

      try {
        const arrayBuffer = await file.arrayBuffer();
        const localAudioContext = getAudioContext(); 

        if (!localAudioContext) {
          toast.error("Audio engine not ready. Please initialize audio by interacting with the page.");
          setAudioFile(null); 
          URL.revokeObjectURL(newObjectUrl);
          setAudioUrl(null);
          audioUrlRef.current = null;
          return;
        }
        
        if (typeof localAudioContext.decodeAudioData !== 'function') {
             toast.error("Web Audio API for decoding is not supported by this browser.");
             setAudioFile(null);
             URL.revokeObjectURL(newObjectUrl);
             setAudioUrl(null);
             audioUrlRef.current = null;
             return;
        }

        localAudioContext.decodeAudioData(
          arrayBuffer,
          (buffer) => {
            setMasterAudioBuffer(buffer);
            setDuration(buffer.duration); // Set duration from the decoded buffer
            toast.success(`"${file.name}" loaded and ready for chopping.`);
          },
          (decodeError) => {
            console.error('Error decoding audio data:', decodeError);
            toast.error(`Error decoding "${file.name}". Not a supported audio format?`);
            setMasterAudioBuffer(null);
            setAudioFile(null);
            URL.revokeObjectURL(newObjectUrl); 
            setAudioUrl(null);
            audioUrlRef.current = null;
          }
        );
      } catch (readErr) {
        console.error('Error reading file as ArrayBuffer:', readErr);
        toast.error('Could not read the audio file.');
        setMasterAudioBuffer(null);
        setAudioFile(null);
        URL.revokeObjectURL(newObjectUrl); 
        setAudioUrl(null);
        audioUrlRef.current = null;
      }
    }
  };
  
  // Handler for triggering file upload
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClearAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause(); // Stop playback if any
      setIsPlaying(false);
    }

    setAudioFile(null);
    setMasterAudioBuffer(null);
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    setChopPoints([]);
    setSelectedChopIndex(null);
    setDuration(0);
    setCurrentTime(0);
    setWaveformPattern(getDefaultWaveformPattern()); // Reset to default pattern
    setSelectedPadId(null); // Also reset selected pad
    toast.info("Audio cleared.");
  };
  
  // Handler for playing/pausing audio
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Handler for adding a chop point at the current playback position
  const addChopPoint = () => {
    if (audioRef.current && audioRef.current.currentTime > 0) {
      const newChopPoint = audioRef.current.currentTime;
      // Sort chop points by time
      const newChopPoints = [...chopPoints, newChopPoint].sort((a, b) => a - b);
      setChopPoints(newChopPoints);
    }
  };
  
  // Handler for removing the selected chop point
  const removeChopPoint = () => {
    if (selectedChopIndex !== null) {
      const newChopPoints = chopPoints.filter((_, index) => index !== selectedChopIndex);
      setChopPoints(newChopPoints);
      setSelectedChopIndex(null);
    }
  };
  
  // Handler for selecting a chop region
  const selectChopRegion = (index: number) => {
    setSelectedChopIndex(index);
    
    // Set playback position to the start of the selected region
    if (audioRef.current && chopPoints[index]) {
      audioRef.current.currentTime = chopPoints[index];
      setCurrentTime(chopPoints[index]);
    }
  };
  
  // Handler for assigning a chop to a pad
  const assignChopToPad = async () => {
    if (selectedChopIndex === null || selectedPadId === null || !audioFile || !masterAudioBuffer) {
      toast.error("Please select a chop, a pad, and ensure an audio file is loaded and processed.");
      return;
    }

    try {
      const startTime = chopPoints[selectedChopIndex];
      const endTime = chopPoints[selectedChopIndex + 1] || masterAudioBuffer.duration;

      if (startTime >= endTime) {
        toast.error("Invalid chop region (start time is after or same as end time).");
        return;
      }

      const localAudioContext = getAudioContext();
      if (!localAudioContext) {
        toast.error("Audio engine not ready.");
        return;
      }

      // 1. Calculate frame offsets and count for the slice
      const sliceDuration = endTime - startTime;
      const startFrame = Math.floor(startTime * masterAudioBuffer.sampleRate);
      const endFrame = Math.floor(endTime * masterAudioBuffer.sampleRate);
      // Ensure endFrame does not exceed buffer length
      const actualEndFrame = Math.min(endFrame, masterAudioBuffer.length);
      const frameCount = actualEndFrame - startFrame;

      if (frameCount <= 0) {
         toast.error("Calculated slice duration is zero or negative. Check chop points.");
         return;
      }
      
      // 2. Create a new AudioBuffer for the slice
      const sliceBuffer = localAudioContext.createBuffer(
        masterAudioBuffer.numberOfChannels,
        frameCount,
        masterAudioBuffer.sampleRate
      );

      // 3. Copy audio data from masterBuffer to sliceBuffer for each channel
      for (let channel = 0; channel < masterAudioBuffer.numberOfChannels; channel++) {
        const masterChannelData = masterAudioBuffer.getChannelData(channel);
        const sliceChannelData = sliceBuffer.getChannelData(channel);
        
        const segment = masterChannelData.subarray(startFrame, actualEndFrame);
        sliceChannelData.set(segment);
      }

      // 4. Generate a name for the slice
      const chopName = `${audioFile.name.split('.')[0]}_chop${selectedChopIndex + 1}`;

      // 5. Call store action to add new sample from buffer
      // Make sure useDrumMachineStore.getState().addNewSampleFromBuffer is available
      const addNewSampleFromBuffer = useDrumMachineStore.getState().addNewSampleFromBuffer;
      const newSampleId = await addNewSampleFromBuffer(
         chopName, 
         sliceBuffer, 
         audioFile.name // Pass original file name
      );

      if (newSampleId) {
        // 6. Assign the new sample (slice) to the selected pad
        assignSampleToPad(selectedPadId, newSampleId);
        toast.success(`Chop "${chopName}" assigned to Pad ${pads.find(p=>p.id === selectedPadId)?.keyLabel || selectedPadId + 1}!`);
      } else {
        toast.error("Failed to create new sample for the chop.");
      }

    } catch (error) {
      console.error('Error assigning chop to pad:', error);
      toast.error("An error occurred while assigning the chop.");
    }
  };
  
  // Update current time during playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const playChopRegion = () => {
    if (selectedChopIndex === null || !masterAudioBuffer || !audioFile) {
      toast.error("No chop region selected or audio not loaded.");
      return;
    }

    const startTime = chopPoints[selectedChopIndex];
    // Use masterAudioBuffer.duration for the end time if it's the last chop or no further chop points exist
    const endTime = (chopPoints.length > selectedChopIndex + 1) ? chopPoints[selectedChopIndex + 1] : masterAudioBuffer.duration;

    if (startTime >= endTime) {
      toast.error("Invalid chop region (start time is after or same as end time).");
      return;
    }

    try {
      const localAudioContext = getAudioContext();
      if (!localAudioContext) {
        toast.error("Audio engine not ready.");
        return;
      }

      const source = localAudioContext.createBufferSource();
      source.buffer = masterAudioBuffer;
      source.connect(localAudioContext.destination);
      
      const offset = startTime;
      const durationOfChop = endTime - startTime;
      
      source.start(0, offset, durationOfChop);
      toast.info(`Playing chop: ${selectedChopIndex + 1} (${durationOfChop.toFixed(2)}s)`);

    } catch (error) {
      console.error("Error playing chop region:", error);
      toast.error("Could not play chop region.");
    }
  };
  
  // When audio is loaded, update duration
  const handleAudioLoaded = () => {
    if (audioRef.current && !masterAudioBuffer) { // Only set from <audio> if buffer not yet decoded
      setDuration(audioRef.current.duration);
    }
  };
  
  // Effect for cleaning up the object URL
  useEffect(() => {
    // Store the ref itself, its .current property might change by the time cleanup runs
    const ref = audioUrlRef;
    return () => {
        if (ref.current) {
            URL.revokeObjectURL(ref.current);
            // No need to set ref.current = null here, it's a cleanup.
        }
    };
  }, []); // Empty dependency array, runs only once on mount for unmount cleanup.

  // Generate a default waveform pattern when component first mounts or audioFile is cleared
  useEffect(() => {
    // This effect was for initializing default pattern, now handled by useState initial or useEffect []
    // if (!audioFile && waveformPattern.length === 0) { 
    //   setWaveformPattern(getDefaultWaveformPattern());
    // }
  }, [audioFile]); // Keep audioFile dependency if we want to regenerate a default pattern when file is cleared externally
                    // but handleClearAudio now explicitly resets it.
  
  // Render a visualization of the waveform and chop points
  const renderWaveform = () => {
    return (
      <div 
        ref={waveformRef} 
        className="h-24 bg-zinc-800 my-4 relative cursor-pointer border border-red-800 rounded-md overflow-hidden"
        onClick={(e) => {
          if (audioRef.current && waveformRef.current && audioUrl) {
            // Calculate position based on click
            const rect = waveformRef.current.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const percentage = offsetX / rect.width;
            const newTime = percentage * duration;
            
            // Set audio position
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
          } else if (!audioUrl) {
            // Prompt to upload a file if none is loaded
            triggerFileUpload();
          }
        }}
      >
        {/* Optional overlay text when no file is loaded */}
        {!audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div className="text-red-500 text-opacity-70 font-medium">
              Click to upload audio file
            </div>
          </div>
        )}
        {/* Playback position indicator - only show when audio is loaded */}
        {audioUrl && duration > 0 && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" 
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        )}
        
        {/* Chop points markers */}
        {chopPoints.map((point, index) => (
          <div 
            key={index}
            className={`absolute top-0 bottom-0 w-0.5 ${selectedChopIndex === index ? 'bg-white' : 'bg-yellow-500'} cursor-pointer z-20`}
            style={{ left: `${(point / duration) * 100}%` }}
            onClick={(e) => {
              e.stopPropagation();
              selectChopRegion(index);
            }}
          />
        ))}
        
        {/* Waveform visualization */}
        <div className="w-full h-full">
          {/* Dynamic audio visualization */}
          <div className="w-full h-full flex items-center">
            {/* Create a grid of bars to simulate waveform */}
            <div className="w-full h-3/4 flex items-center">
              {/* If we have a stored waveform pattern, use it, otherwise generate a default pattern */}
              {(waveformPattern.length > 0 ? waveformPattern : Array(64).fill(30)).map((height, idx) => {
                // Use a subtle animation effect for the current position only when audio is loaded
                const isNearCurrentPos = audioUrl && duration > 0 ? 
                  Math.abs((idx / 64) - (currentTime / duration)) < 0.05 : false;
                return (
                  <div 
                    key={idx} 
                    className={`mx-0.5 bg-red-600 ${isNearCurrentPos ? 'opacity-90' : 'opacity-60'}`}
                    style={{ 
                      height: `${height}%`,
                      width: `${100 / 64}%`,
                      transition: 'height 0.2s ease-out'
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Chop Block</h2>
        <p className="text-sm text-zinc-300 mb-4">
          Upload an audio file, create chop points, and assign segments to pads.
        </p>
        
        {/* File upload */}
        <div className="flex items-center gap-2 p-3 bg-red-950 rounded-lg border border-red-800 mb-4">
          <Button
            variant="outline"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-md flex items-center gap-2 flex-grow text-white border-orange-700"
            onClick={triggerFileUpload}
            disabled={!!audioFile} // Disable upload if a file is already loaded
          >
            <Upload className="h-4 w-4" />
            <span>{audioFile ? audioFile.name : 'Upload Audio (MP3/WAV)'}</span>
          </Button>
          {audioFile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearAudio}
              className="text-red-500 hover:text-red-400 ml-2 p-2" // Added padding for better click area
              title="Clear loaded audio"
            >
              <Trash2 size={20} /> 
            </Button>
          )}
          
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav" // .mpeg for broader mp3, x-wav for robustness
            className="hidden"
          />
        </div>
        
        {/* Always show waveform visualization for better UX */}
        {renderWaveform()}
        
        {/* Audio player */}
        {audioUrl && (
          <>
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleAudioLoaded}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            
            {/* Playback controls */}
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayback}
                className="h-10 w-10 bg-red-800 hover:bg-red-700 border-2 border-red-500 rounded-xl"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </Button>
              
              <div className="text-sm">
                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                {' / '}
                {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={addChopPoint}
                disabled={!audioUrl}
                className="h-10 w-10 bg-red-800 hover:bg-red-700 border-2 border-red-500 rounded-xl ml-auto"
                title="Add Chop Point"
              >
                <Scissors size={18} />
              </Button>
              
              {selectedChopIndex !== null && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={removeChopPoint}
                  className="h-10 w-10 rounded-xl"
                  title="Remove Chop Point"
                >
                  <Trash2 size={18} />
                </Button>
              )}
            </div>
            
            {/* Volume control */}
            <div className="flex items-center gap-2 mb-6">
              <Volume2 className="h-4 w-4" />
              <Label className="mr-2">Volume</Label>
              <Slider
                defaultValue={[1]}
                max={1}
                min={0}
                step={0.01}
                onValueChange={(values) => {
                  if (audioRef.current) {
                    audioRef.current.volume = values[0];
                  }
                }}
              />
            </div>
            
            {/* Chop points list */}
            {chopPoints.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2">Chop Regions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {chopPoints.map((startTime, index) => {
                    const endTime = chopPoints[index + 1] || duration;
                    const isSelected = selectedChopIndex === index;
                    
                    return (
                      <div 
                        key={index} 
                        className={`p-2 rounded-md cursor-pointer ${isSelected ? 'bg-red-700' : 'bg-zinc-800'} hover:bg-red-800`}
                        onClick={() => selectChopRegion(index)}
                      >
                        <div className="text-xs font-mono">
                          {Math.floor(startTime / 60)}:{Math.floor(startTime % 60).toString().padStart(2, '0')}
                          {' - '}
                          {Math.floor(endTime / 60)}:{Math.floor(endTime % 60).toString().padStart(2, '0')}
                        </div>
                        <div className="text-sm">
                          Chop {index + 1} ({(endTime - startTime).toFixed(2)}s)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Preview Chop Button - Appears when a chop is selected */}
            {selectedChopIndex !== null && masterAudioBuffer && (
              <div className="mt-4 mb-6"> 
                <Button 
                  variant="outline"
                  onClick={playChopRegion}
                  className="w-full bg-teal-600 hover:bg-teal-500 border-teal-500 text-white"
                  title="Preview Selected Chop"
                >
                  <Play size={18} className="mr-2" /> Preview Chop {selectedChopIndex + 1}
                </Button>
              </div>
            )}
            
            {/* Pad assignment */}
            {selectedChopIndex !== null && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Assign Chop {selectedChopIndex + 1} to Pad</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {pads.map((pad) => (
                    <button
                      key={pad.id}
                      className={`p-2 text-center rounded-md ${selectedPadId === pad.id ? 'bg-red-600' : 'bg-zinc-800'} hover:bg-zinc-700`}
                      onClick={() => setSelectedPadId(pad.id)}
                    >
                      <div className="text-xl font-bold">{pad.keyLabel}</div>
                    </button>
                  ))}
                </div>
                
                <Button
                  variant="default"
                  onClick={assignChopToPad}
                  disabled={selectedChopIndex === null || selectedPadId === null || !masterAudioBuffer}
                  className="w-full bg-red-600 hover:bg-red-500"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Assign Chop {selectedChopIndex !== null ? selectedChopIndex + 1 : ''} to Pad {selectedPadId !== null ? pads.find(p=>p.id === selectedPadId)?.keyLabel : ''}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* MPC logo at the bottom */}
      <div className="mt-8 text-center">
        <h1 className="text-6xl font-bold font-mono tracking-wider text-red-600 opacity-80">MPC</h1>
      </div>
    </div>
  );
};

export default ChopBlock;