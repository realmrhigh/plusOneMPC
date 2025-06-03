Music Production App - Feature Map
I. Project & File Management
Projects:

Create New Projects (with app-specific templates)

Load Existing Projects (with potential for importing from common formats)

Load Demo Projects

Save Projects

Browser:

Navigate Internal Device Storage & External Storage (e.g., USB via USB-C, SD Card if applicable)

View by: Location, Content Type (Drums, Instruments, Samples, etc.), Sound Packs/Expansions

File Filtering (Project, Pattern, Kit, Plugin Preset, Sample) & Sorting

File Operations: Load, Load All to Pool, Delete, Storage Info, Format External Storage

Sample Auditioning: Preview with Play, Auto-Play, Volume, Sync to Tempo, Warp

Customizable Folder Shortcuts

Browser Options: Configure display, search, and loading behaviors

Sample Pool:

Manage all samples loaded into the current project

Assign samples from Pool to Virtual Pads/Keygroups

Disk Streaming: Stream samples from storage or load fully into memory

Exporting:

Audio Mixdown:

Formats: WAV, AIFF, MP3, FLAC, OGG

Options: Bit Depth, Sample Rate, Render Source (Outputs/Stems), Audio Tail

Sequence Export:

Formats: Standard MIDI File (.mid), App-specific Pattern Format

II. Sequencing & Arrangement
Sequences:

Create, Select, Name, and Manage Multiple Sequences

Parameters: BPM (per sequence or global), Bar Length, Loop On/Off, Loop Start/End, Transposition

Sequence Editing:

Erase (Events, Automation, Specific Notes)

Clear, Trim to Length

Transpose Events (MIDI)

Insert/Delete Bars

Half/Double Length (with event duplication)

Copy Sequence, Copy Bars, Copy Events (with Replace/Merge options)

Track Types:

Drum Tracks: Sample-based, multiple layers per virtual pad

Keygroup Tracks: Pitched multi-samples, multiple layers per keygroup

Plugin Tracks: Host internal instrument plugins

MIDI Tracks: Sequence external MIDI hardware/apps (via USB/Bluetooth)

Audio Tracks: Record and play back linear audio

Bus Tracks: Submixes, Returns, Master Output

Track Operations:

Naming, Selection, Type Change

Monitoring: Off, In, Auto, Merge (for audio/MIDI inputs)

Independent Track Length & Velocity Scaling

Track Transposition (MIDI-based)

Duplicate Track (with/without events), Delete Track, Copy Track

Drum Track Specific: Merge Pads/Tracks, Copy Pads, Explode Track to multiple tracks, Edit Virtual Pad Note Map

Keygroup Track Specific: Merge Tracks

Recording:

Real-time Recording:

Into Arrangement View or Linear Timeline

Overdubbing (manual or automatic)

Punch In/Out Recording

Loop Recording

Step Sequencing:

Classic step-input for patterns on virtual pads/grid

Velocity per step, various step sizes (time divisions)

Pattern Nudge, Velocity Presets

Step Automation recording

Undo/Redo: For recording and editing actions

Arrangement (Linear Song Construction - Arrange Mode):

DAW-style linear timeline for arranging sequences and audio

Arrangement Editing: Clear, Double Length, Trim, Half/Double Speed (MIDI), Pitch Quantize (MIDI), Humanize (MIDI), Generate Random Events (MIDI), Split Events (MIDI), Convert to Progression (MIDI), Bounce to Sample/Audio Track, Flatten Audio

Arrangement Track Editor: Integrated grid/automation editor

User-definable Locator Markers

Event Editing:

Grid View:

Piano roll (MIDI/Plugin/Keygroup) & Drum grid (Drum) & Audio region view (Audio)

Tools: Pencil, Eraser, Select, Marquee, Scissors, Mute, Zoom (on-screen gestures)

Edit operations: Nudge, Edit Start/End, Transpose (MIDI), Split, Fade, Level, Reverse, Warp (Audio)

Velocity/Automation Lane: View and edit note velocities and automation data (including Probability & Ratchet for MIDI)

List Edit View:

Detailed event list with parameters (Time, Type, Note/Pad, Length, Velocity, Modifiers, etc.)

Event filtering, insertion, and modification

Tempo Map Editing

Automation:

Global Read/Write/Off states

Record and edit automation for track parameters, mixer controls, and plugin parameters

Timing Correct (Quantization):

Apply to MIDI events during or after recording

Adjustable strength, swing, time division

Global TC enable/disable

Metronome:

Enable/Disable, Volume, Sound, Count-in options

Song Mode:

Chain sequences to create a song structure

Parameters per step: Sequence, Repeats, Tempo

Playback options: Next Bar, Sudden

Convert Song to a single Sequence

Next Sequence Mode:

Trigger sequences live using virtual pads or mapped MIDI controllers

Transition options: Next Bar, Sudden, Hold

III. Sampling & Sample Editing
Sampler (Recording):

Input Sources: External Audio (via USB-C audio interface, device microphone), Internal Resample (L/R/Stereo)

Mono/Stereo Recording

Input Monitoring (with low-latency option)

Threshold Recording, Manual Start

Max Recording Length setting

Recording Methods:

Sample: Standard recording, manual slice marker insertion during record

Slice: Virtual pads insert slice markers during record

Pad Tap: Record directly to selected virtual pad on tap (Drum Tracks)

Pad Hold: Record directly to selected virtual pad while held (Drum Tracks)

Post-Recording: Name, Assign to Track/Pad, Add Event, Edit

Integrated Tuner

Auto Sampler:

Automatically create Keygroup programs from internal plugins or external audio sources (via USB-C)

Parameters: Note Range, Velocity Layers, Note Length, Tail, Looping, Naming

Sample Edit Mode:

Waveform Display: Zoom, Scroll (touch gestures), Units (Time, Samples, Beats)

Trim Mode:

Set Start/End/Loop points for a sample region

Looping: On/Off, Forward/Reverse/Alternating, Loop Lock, X-Fade

Parameters: Tune (Semi/Fine), Root Note, BPM (Manual, Detect, Tap, From BPM for tuning), Key (Manual/Detect)

0 Snap (zero-crossing editing)

Assign to Pad: As new sample (with crop) or non-destructive slice reference

Destructive Processes: Discard, Delete, Silence, Extract, Normalize, Reverse, Fade In/Out, Pitch Shift, Time Stretch, Gain Change, Copy, Bit Reduce, Stereo > Mono

Chop Mode:

Divide sample into multiple slices

Chopping Methods: Manual, Threshold-based, Equal Regions, BPM-based

Audition Slices (One-Shot toggle)

Add, Split, Combine, Clear Slices

Link Slices (for non-contiguous/overlapping slice editing)

Convert/Assign Slices:

To New Drum Track (as non-destructive slices or new samples)

To New Audio Track (with warp option)

Assign individual slice to Pad

Create Patched Phrase (tempo-synced sample)

Non-Destructive Slice Processes: Subset of Trim Mode processes applied to selected slice

Pad Mode: Edit sample parameters within the context of its assigned virtual pad/track

Stems Separation:

Isolate Vocals, Bass, Drums, Other musical elements from a sample

Assign stems to Pad Layers or Sample Pool

IV. Sound Generation & Synthesis
Drum Tracks (Program Edit):

Multi-layered samples per virtual pad (e.g., up to 8)

Layer Playback: Cycle, Velocity, Random

Per-Layer: Sample select, Start/End/Loop, Slice playback, Pitch, Level, Pan, Offset, Velocity Range, Randomization

Global Pad: Tuning, Polyphony, Mute Group/Targets, Sample Play Mode (One Shot, Note On/Off), Simultaneous Play

Envelopes: Amp, Filter, Pitch (AD/AHDS/ADSR types) with Velocity Modulation

LFO: Waveform, Rate, Sync, Destinations (Pitch, Filter, Amp, Pan)

Drum FX: Multiple additional simple effects per pad (e.g., Ring Mod, Bit Crush, Drive, Filters etc.)

Utility: Flatten Pad, Create Keygroup from Pad

Keygroup Tracks (Program Edit):

Multi-layered, pitched samples per keygroup (e.g., up to 8 layers)

Legacy & Advanced synthesis modes

Global & Keygroup-level parameters (Tuning, Polyphony, Note Range, Mute Group, Layer Play, etc.)

Per-Layer: Similar to Drum Track layers (Sample, Start/End/Loop, etc.)

Legacy Mode: Standard Amp/Filter/Pitch Envelopes, LFO, Basic Modulations

Advanced Mode:

Dual Filters (Series/Parallel, Blend, various types)

Advanced Envelopes (Amp, Filter, Pitch, Aux - ADHSR with looping, tempo sync)

Multiple LFOs (Per-voice & Global with advanced shaping)

Utilities: Ramp Time, Note Counter, Drift, Timbre Shift, Portamento

Keygroup Stack Effects: Unison & Harmonizer effects

Modulation Matrix (e.g., 32 slots)

Parameter Randomization

Plugin Instruments:

Host internal synth and instrument plugins

Internal Plugins (Examples): Bassline-style, Electric Piano-style, Versatile Synth (Hype-like), Analog-style Tube Synth, Drum Synth (individual & multi-sound), Tape-based Sampler (Mellotron-like), String Synth (Solina-like), Classic Analog Synth (Odyssey-style)

Each plugin has its own unique interface and parameters

Sounds Mode:

Browse and load Plugin instruments and presets

Filter by track type, manage sound packs/expansions

Favorites: Save and quickly recall preferred instrument presets

Setlists: Create and recall lists of projects for live performance

V. Mixing & Audio Routing
Channel Mixer:

View and control Tracks, Submixes, Returns, Main Outputs

Per-Channel Tabs:

Volume: Level faders and meters

Pan & Volume: Mute, Solo/Cue, Automation State, Record Arm, Pan, Level

Sends: Levels for multiple Send buses (e.g., 4)

Effects: Multiple Insert FX slots (e.g., 4)

I/O: Monitoring, MIDI In/Out/Channel/Send To (for MIDI tracks), Audio In/Out routing

Mixer Configuration: Solo behavior, Crossfader profile (if applicable), Metering options

Pad Mixer (for Drum/Keygroup Tracks):

View and control individual virtual pads within a track

Per-Pad Tabs: Similar to Channel Mixer (Volume, Pan & Volume, Sends, Effects, I/O for pad output routing)

Pad Mixer Configuration: Filter view, Automation behavior

Quick Access Mixer Controls:

UI elements for quick access to essential mixing parameters for current Pad/Track and related Main Output/Track

Audio Routing:

Flexible output routing for Tracks and Pads (to Submixes, direct Outputs)

Submixes for track grouping

Return tracks for Send Effects

Input Configuration:

Selectable audio inputs for recording (Audio Tracks, Sampler, Looper) via USB-C or device mic

Configurable MIDI input (USB/Bluetooth) per track

VI. Effects Processing
Insert Effects:

Multiple slots (e.g., up to 4) per Pad, Track, Submix, Return, or Main Output

Extensive library of effect types (Delay, Reverb, Dynamics, EQ/Filter, Harmonic, Modulation, Vocal - see Appendix for potential list)

Parameter editing, Preset load/save per effect instance

FX Racks: Save and load chains of insert effects

Send/Return Effects:

Multiple dedicated Send buses (e.g., 4)

Load effects onto Return tracks; control send levels from Tracks/Pads

XY Pad Effects Control:

Real-time on-screen XY pad control of dedicated XY-controllable plugin or generic XY effect insert

Various performance effects with X/Y parameter mapping

Latch mode, Attack/Release, Wet/Dry controls

Master Effects: Effects applied to the Main Output track

VII. Performance & Real-time Control
Virtual Pads:

Velocity & Pressure sensitive (simulated via touch), RGB backlit (on-screen)

Full Level / Half Level / Custom Velocity modes

Performance Mode (e.g., "Scale Mode"): Play Scales, Modes, Chords, and Progressions using the virtual pads

Note Repeat:

Repeat notes at tempo-synced rates (based on TC settings)

Latch mode available

Arpeggiator:

Built-in arpeggiator with various patterns, rates, octaves, swing, gate, humanize

Latch mode available

Assignable Macro Controls / On-Screen Knobs:

Touch-sensitive on-screen knobs for real-time parameter control

Multiple operational modes (Screen context, Project global, Track specific, Pad specific, etc.)

Macro Control Edit Mode: Create custom macro assignments, learn parameters from app, define ranges and behaviors for on-screen knobs or mapped MIDI controllers

Pad Mute / Track Mute Modes:

Mute/Solo individual Virtual Pads (within Drum Tracks) or entire Tracks

Timing Correct quantization for mutes/solos

Pad/Track Groups for simultaneous muting/soloing

Looper:

Real-time audio recording, overdubbing, and playback

Sync to tempo, reverse, clear, export loop

MIDI Learn:

Map external MIDI controller knobs/buttons (via USB/Bluetooth) to app parameters

MIDI Control Mode (Output Mapping):

Customize MIDI messages sent from app controls (virtual or mapped) to external MIDI gear/apps

VIII. Editing & Workflow Tools
Core Editing: Undo/Redo, Erase (real-time or window), Copy/Delete

Navigation Controls: On-screen data dial simulation, +/- buttons, touch gestures

Time Counter / Locate Window: Precise playhead positioning, loop/record settings

Customizable Workflow Shortcuts: Quick access to frequently used modes/functions

Context-Sensitive On-Screen Controls: UI elements adapt to current task

Virtual Pad Color Mode: Assign custom colors to virtual pads for visual organization

Key Ranges Mode: Visual overview of MIDI track key ranges for external keyboard input, with MIDI filtering

IX. System & App Integration
Android App Environment

Audio Interface Support (via USB-C): Configuration for external audio devices

Storage: Internal device storage, SD Card (if supported by Android device), USB storage (via USB-C)

System Preferences:

Global settings for Sync, MIDI, Audio, Project Load/Save, UI behavior

Reset options for UI layout and preferences

X. Connectivity & Synchronization
MIDI:

USB & Bluetooth MIDI I/O

MIDI Clock Send/Receive

MIDI Time Code (MTC) Send/Receive

MIDI Machine Control (MMC) Send/Receive

MIDI Monitor for troubleshooting

Network Connectivity:

Wi-Fi for firmware/app updates, online services (e.g., cloud storage, sample downloads)

Bluetooth:

For MIDI controllers & audio output
