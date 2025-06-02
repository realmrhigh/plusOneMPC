package com.example.kotlindrummachine

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.mapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.MutableSharedFlow // For UI Events
import kotlinx.coroutines.flow.asSharedFlow // For UI Events
import kotlinx.coroutines.launch
import java.util.UUID

class DrumMachineViewModel(application: Application, private val audioPlayer: AudioPlayer) : AndroidViewModel(application) {

    private val app = application // Store application context for SharedPreferences

    companion object {
        // Tempo related calculation will be dynamic now
        // private const val TEMPO_BPM = 120.0
        private const val STEPS_PER_BEAT = 4 // 16th notes
        private const val BEATS_PER_MINUTE = 60.0
        private const val MILLISECONDS_PER_MINUTE = BEATS_PER_MINUTE * 1000.0 // Use Double for precision
        // const val MILLISECONDS_PER_STEP: Long = (MILLISECONDS_PER_MINUTE / (TEMPO_BPM * STEPS_PER_BEAT)).toLong()
        const val NUM_STEPS = 16
    }

    private fun calculateMillisecondsPerStep(tempo: Int): Long {
        if (tempo == 0) return Long.MAX_VALUE // Avoid division by zero, effectively pausing
        return (MILLISECONDS_PER_MINUTE / (tempo * STEPS_PER_BEAT)).toLong()
    }

    // Samples State
    private val _samples = MutableStateFlow<List<Sample>>(emptyList())
    val samples: StateFlow<List<Sample>> = _samples.asStateFlow()

    // Pads State
    private val _pads = MutableStateFlow<List<Pad>>(emptyList())
    val pads: StateFlow<List<Pad>> = _pads.asStateFlow()

    // Multiple Patterns Management
    private val _patterns = MutableStateFlow<List<Pattern>>(emptyList())
    val patterns: StateFlow<List<Pattern>> = _patterns.asStateFlow()

    private val _currentPatternId = MutableStateFlow<Int?>(null)
    val currentPatternId: StateFlow<Int?> = _currentPatternId.asStateFlow()

    val currentPattern: StateFlow<Pattern?> = combine(patterns, currentPatternId) { patternList, currentId ->
        patternList.find { it.id == currentId }
    }.stateIn(viewModelScope, SharingStarted.Lazily, null)


    // Drum Kits Management
    private val _kits = MutableStateFlow<List<DrumKit>>(emptyList())
    val kits: StateFlow<List<DrumKit>> = _kits.asStateFlow()

    private val _activeKitId = MutableStateFlow<String?>(null)
    val activeKitId: StateFlow<String?> = _activeKitId.asStateFlow()

    val activeKitName: StateFlow<String> = combine(kits, activeKitId) { kitList, currentId ->
        kitList.find { it.id == currentId }?.name ?: "No Kit Selected"
    }.stateIn(viewModelScope, SharingStarted.Lazily, "No Kit Selected")


    // Tempo Control
    private val _tempo = MutableStateFlow(PersistenceManager.loadInt(app, PersistenceManager.KEY_TEMPO, 120))
    val tempo: StateFlow<Int> = _tempo.asStateFlow()

    // Metronome State
    private val _isMetronomeEnabled = MutableStateFlow(PersistenceManager.loadBoolean(app, PersistenceManager.KEY_METRONOME_ENABLED, false))
    val isMetronomeEnabled: StateFlow<Boolean> = _isMetronomeEnabled.asStateFlow()

    private val _metronomeVolume = MutableStateFlow(PersistenceManager.loadFloat(app, PersistenceManager.KEY_METRONOME_VOLUME, 0.75f))
    val metronomeVolume: StateFlow<Float> = _metronomeVolume.asStateFlow()

    // 16 Levels Mode State
    private val _is16LevelsModeActive = MutableStateFlow(PersistenceManager.loadBoolean(app, PersistenceManager.KEY_16_LEVELS_ACTIVE, false))
    val is16LevelsModeActive: StateFlow<Boolean> = _is16LevelsModeActive.asStateFlow()

    // Load source pad ID, defaulting to -1 if not found, ViewModel interprets -1 as null/not set.
    private val _levelsSourcePadId = MutableStateFlow<Int?>(
        PersistenceManager.loadInt(app, PersistenceManager.KEY_16_LEVELS_SOURCE_PAD_ID, -1)
            .let { if (it == -1) null else it }
    )
    val levelsSourcePadId: StateFlow<Int?> = _levelsSourcePadId.asStateFlow()

    private val _isSelectingLevelsSourcePad = MutableStateFlow(false) // Transient state, not persisted
    val isSelectingLevelsSourcePad: StateFlow<Boolean> = _isSelectingLevelsSourcePad.asStateFlow()

    val canSetSourcePad: StateFlow<Boolean> = pads.mapLatest { padList ->
        padList.any { it.sampleId != null }
    }.stateIn(viewModelScope, SharingStarted.Lazily, false)


    // UI Events
    private val _uiEvents = MutableSharedFlow<String>()
    val uiEvents = _uiEvents.asSharedFlow()


    // Playback State
    private val _isPlaying = MutableStateFlow(false) // Playback state is not persisted
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _currentStepIndex = MutableStateFlow(0)
    val currentStepIndex: StateFlow<Int> = _currentStepIndex.asStateFlow()

    private var sequencerJob: Job? = null

    init {
        loadPersistedData()
        launchSequencerLoop()
    }

    private fun loadPersistedData() {
        // Initialize Samples (not persisted, but needed for default kit/pads if no kits loaded)
        _samples.value = listOf(
            Sample("kick", "Kick Drum", R_DataModels.raw.kick),
            Sample("snare", "Snare Drum", R_DataModels.raw.snare)
        )

        // Load Kits
        val loadedKits = PersistenceManager.loadKits(app)
        if (loadedKits.isNotEmpty()) {
            _kits.value = loadedKits
        } else {
            // Create Default Kit if none loaded
            val defaultPadsForKit = List(NUM_STEPS) { index ->
                val sampleId = when (index) {
                    0 -> "kick"; 1 -> "snare"; else -> null
                }
                PadSettings(sampleId = sampleId, volume = 1.0f, pitch = 0.0f)
            }
            val defaultKit = DrumKit(
                id = UUID.randomUUID().toString(),
                name = "Default Kit",
                padSettings = defaultPadsForKit.associateBy { it.sampleId?.hashCode() ?: UUID.randomUUID().hashCode() } // Placeholder keying, should be padId
                    .mapKeys {
                        // This mapping is flawed, need to map by pad ID during creation.
                        // Corrected logic: (0 until NUM_STEPS).associateWith { defaultPadsForKit[it] }
                         val padId = defaultPadsForKit.indexOfFirst { settings ->
                            // This is still not right, need to map 0..15 to the settings.
                            // Example: index to PadSetting.
                            // Let's assume defaultPadsForKit is already implicitly indexed 0..15
                            true // Dummy, this part needs a rethink if defaultPadsForKit is not indexed by padId
                        }
                        padId // This key logic is wrong.
                    }
            // Corrected default kit padSettings map
            val defaultPadSettingsMapCorrected = (0 until NUM_STEPS).associateWith { padId ->
                 val sampleId = when (padId) {
                    0 -> "kick"; 1 -> "snare"; else -> null
                }
                PadSettings(sampleId = sampleId, volume = 1.0f, pitch = 0.0f)
            }
            val correctedDefaultKit = DrumKit(
                 id = UUID.randomUUID().toString(),
                 name = "Default Kit",
                 padSettings = defaultPadSettingsMapCorrected
            )
            _kits.value = listOf(correctedDefaultKit)
        }

        // Load Active Kit ID and corresponding pads
        val loadedActiveKitId = PersistenceManager.loadString(app, PersistenceManager.KEY_ACTIVE_KIT_ID, null)
        val kitToLoad = _kits.value.find { it.id == loadedActiveKitId } ?: _kits.value.firstOrNull()

        if (kitToLoad != null) {
            _activeKitId.value = kitToLoad.id
            // Initialize _pads based on the active kit
            _pads.value = List(NUM_STEPS) { padId ->
                val settings = kitToLoad.padSettings[padId]
                Pad(
                    id = padId,
                    sampleId = settings?.sampleId,
                    volume = settings?.volume ?: 1.0f,
                    pitch = settings?.pitch ?: 0.0f
                )
            }
        } else {
            // No kits available at all (even default failed?), initialize pads to be empty/default
             _pads.value = List(NUM_STEPS) { padId -> Pad(id = padId, sampleId = null) }
        }


        // Load Patterns
        val loadedPatterns = PersistenceManager.loadPatterns(app)
        if (loadedPatterns.isNotEmpty()) {
            _patterns.value = loadedPatterns
        } else {
            // Create Default Pattern if none loaded
            val kickSteps = List(NUM_STEPS) { false }.toMutableList().apply { this[0]=true; this[4]=true; this[8]=true; this[12]=true }.toList()
            val snareSteps = List(NUM_STEPS) { false }.toMutableList().apply { this[4]=true; this[12]=true }.toList()
            val defaultPattern = Pattern(id = 1, name = "Pattern 1", tracks = listOf(Track(0, kickSteps), Track(1, snareSteps)))
            _patterns.value = listOf(defaultPattern)
        }

        // Load Current Pattern ID
        val loadedPatternIdStr = PersistenceManager.loadString(app, PersistenceManager.KEY_CURRENT_PATTERN_ID, null)
        val loadedPatternId = loadedPatternIdStr?.toIntOrNull()
        _currentPatternId.value = if (loadedPatternId != null && _patterns.value.any { it.id == loadedPatternId }) {
            loadedPatternId
        } else {
            _patterns.value.firstOrNull()?.id
        }
    }


    // Helper for updating a specific pattern in the _patterns list
    private fun updatePatternInList(patternId: Int, transform: (Pattern) -> Pattern) {
        _patterns.value = _patterns.value.map {
            if (it.id == patternId) transform(it) else it
        }
        PersistenceManager.savePatterns(app, _patterns.value)
    }


    fun toggleStep(padId: Int, stepIndex: Int) {
        val currentId = _currentPatternId.value ?: return
        updatePatternInList(currentId) { patternToUpdate ->
            val trackIndex = patternToUpdate.tracks.indexOfFirst { it.padId == padId }
            val track = if (trackIndex != -1) patternToUpdate.tracks[trackIndex] else Track(padId = padId)

            val newSteps = track.steps.toMutableList().apply { this[stepIndex] = !this[stepIndex] }.toList()
            val updatedTrack = track.copy(steps = newSteps)

            val newTracks = patternToUpdate.tracks.toMutableList()
            if (trackIndex != -1) newTracks[trackIndex] = updatedTrack else newTracks.add(updatedTrack)

            patternToUpdate.copy(tracks = newTracks.toList())
        }
        // PersistenceManager.savePatterns(app, _patterns.value) // Already in updatePatternInList
    }

    fun activateStep(padId: Int, stepIndex: Int) {
        val currentId = _currentPatternId.value ?: return
        updatePatternInList(currentId) { patternToUpdate ->
            val trackIndex = patternToUpdate.tracks.indexOfFirst { it.padId == padId }
            val track = if (trackIndex != -1) patternToUpdate.tracks[trackIndex] else Track(padId = padId)

            val newSteps = track.steps.toMutableList().apply { this[stepIndex] = true }.toList()
            val updatedTrack = track.copy(steps = newSteps)

            val newTracks = patternToUpdate.tracks.toMutableList()
            if (trackIndex != -1) newTracks[trackIndex] = updatedTrack else newTracks.add(updatedTrack)

            patternToUpdate.copy(tracks = newTracks.toList())
        }
        // PersistenceManager.savePatterns(app, _patterns.value) // Already in updatePatternInList
    }

    fun renamePattern(patternId: Int, newName: String) {
        _patterns.value = _patterns.value.map {
            if (it.id == patternId) {
                it.copy(name = newName)
            } else { it }
        }
        PersistenceManager.savePatterns(app, _patterns.value)
    }

    fun deletePattern(patternId: Int) {
        val currentPatterns = _patterns.value
        val patternToRemove = currentPatterns.find { it.id == patternId } ?: return

        _patterns.value = currentPatterns - patternToRemove
        PersistenceManager.savePatterns(app, _patterns.value)

        if (_currentPatternId.value == patternId) {
            _currentPatternId.value = _patterns.value.firstOrNull()?.id
            PersistenceManager.saveString(app, PersistenceManager.KEY_CURRENT_PATTERN_ID, _currentPatternId.value?.toString())
        }
    }

    fun createNewPattern() {
        val newId = (_patterns.value.maxOfOrNull { it.id } ?: 0) + 1
        val newPatternName = "Pattern $newId"
        val defaultTracksForNewPattern = listOf(
            Track(padId = 0, steps = List(NUM_STEPS) { false }),
            Track(padId = 1, steps = List(NUM_STEPS) { false })
        )
        val newPattern = Pattern(id = newId, name = newPatternName, tracks = defaultTracksForNewPattern)
        _patterns.value = _patterns.value + newPattern
        PersistenceManager.savePatterns(app, _patterns.value)
        _currentPatternId.value = newId
        PersistenceManager.saveString(app, PersistenceManager.KEY_CURRENT_PATTERN_ID, _currentPatternId.value?.toString())
    }

    fun selectPattern(patternId: Int) {
        if (_patterns.value.any { it.id == patternId }) {
            _currentPatternId.value = patternId
            PersistenceManager.saveString(app, PersistenceManager.KEY_CURRENT_PATTERN_ID, _currentPatternId.value?.toString())
        }
    }

    fun selectKit(kitId: String) {
        val selectedKit = _kits.value.find { it.id == kitId }
        if (selectedKit != null) {
            _activeKitId.value = kitId
            PersistenceManager.saveString(app, PersistenceManager.KEY_ACTIVE_KIT_ID, _activeKitId.value)

            _pads.value = List(NUM_STEPS) { padId ->
                val settings = selectedKit.padSettings[padId]
                Pad(
                    id = padId,
                    sampleId = settings?.sampleId,
                    volume = settings?.volume ?: 1.0f,
                    pitch = settings?.pitch ?: 0.0f
                )
            }
        }
    }

    fun saveCurrentAssignmentsAsKit(kitName: String) {
        val currentPadSettingsMap = _pads.value.associate { pad ->
            pad.id to PadSettings(sampleId = pad.sampleId, volume = pad.volume, pitch = pad.pitch)
        }

        val newKit = DrumKit(
            id = UUID.randomUUID().toString(),
            name = kitName.ifBlank { "Untitled Kit" },
            padSettings = currentPadSettingsMap
        )
        _kits.value = _kits.value + newKit
        PersistenceManager.saveKits(app, _kits.value)
        selectKit(newKit.id) // This will also save the new activeKitId
    }

    fun assignSampleToPad(padId: Int, newSampleId: String?) {
        _pads.value = _pads.value.map {
            if (it.id == padId) {
                it.copy(sampleId = newSampleId)
            } else { it }
        }
        // Consider if this change should make the current kit "dirty" or auto-save the kit.
        // For now, kit changes are explicit via "Save Kit".
    }

    fun setPadVolume(padId: Int, newVolume: Float) {
        val clampedVolume = newVolume.coerceIn(0.0f, 1.0f)
        _pads.value = _pads.value.map {
            if (it.id == padId) {
                it.copy(volume = clampedVolume)
            } else {
                it
            }
        }
    }

    fun setPadPitch(padId: Int, newPitch: Float) {
        val clampedPitch = newPitch.coerceIn(-12.0f, 12.0f) // Example range: +/- 1 octave
        _pads.value = _pads.value.map {
            if (it.id == padId) {
                it.copy(pitch = clampedPitch)
            } else {
                it
            }
        }
    }

    fun setTempo(newTempo: Int) {
        val clampedTempo = newTempo.coerceIn(40, 240) // Already have this logic from previous diff
        _tempo.value = clampedTempo // Ensure this is before save
        PersistenceManager.saveInt(app, PersistenceManager.KEY_TEMPO, clampedTempo)
    }

    fun toggleMetronome() {
        _isMetronomeEnabled.value = !_isMetronomeEnabled.value
        PersistenceManager.saveBoolean(app, PersistenceManager.KEY_METRONOME_ENABLED, _isMetronomeEnabled.value)
    }

    fun setMetronomeVolume(newVolume: Float) {
        _metronomeVolume.value = newVolume.coerceIn(0.0f, 1.0f)
        PersistenceManager.saveFloat(app, PersistenceManager.KEY_METRONOME_VOLUME, _metronomeVolume.value)
    }

    fun toggle16LevelsMode() {
        val isActive = !_is16LevelsModeActive.value
        _is16LevelsModeActive.value = isActive
        PersistenceManager.saveBoolean(app, PersistenceManager.KEY_16_LEVELS_ACTIVE, isActive)

        if (isActive && _levelsSourcePadId.value == null) {
            _isSelectingLevelsSourcePad.value = true
        } else if (!isActive) {
            _isSelectingLevelsSourcePad.value = false // Ensure this is reset when mode is turned off
        }
    }

    fun startSelectingLevelsSourcePad() {
        // Should only be callable if 16 levels mode is already active or is being activated.
        // For simplicity, let's assume UI enables this button correctly.
        _is16LevelsModeActive.value = true // Ensure mode is active
        PersistenceManager.saveBoolean(app, PersistenceManager.KEY_16_LEVELS_ACTIVE, true)
        _isSelectingLevelsSourcePad.value = true
    }

    fun setLevelsSourcePad(padId: Int) {
        val sourcePad = _pads.value.find { it.id == padId }
        if (sourcePad?.sampleId != null) {
            _levelsSourcePadId.value = padId
            PersistenceManager.saveInt(app, PersistenceManager.KEY_16_LEVELS_SOURCE_PAD_ID, padId)
            _isSelectingLevelsSourcePad.value = false
        } else {
            // No sample on selected pad, or pad doesn't exist
            // Potentially clear _levelsSourcePadId if you want to enforce a valid source always
            // _levelsSourcePadId.value = null
            // PersistenceManager.saveInt(app, PersistenceManager.KEY_16_LEVELS_SOURCE_PAD_ID, -1)
            _isSelectingLevelsSourcePad.value = false // Cancel selection mode
            viewModelScope.launch { // For emitting to SharedFlow
                _uiEvents.emit("Pad $padId has no sample. Select another.")
            }
        }
    }

    fun clearCurrentPattern() {
        val currentId = _currentPatternId.value ?: return
        var clearedPatternName = "Unknown"

        val updatedPatterns = _patterns.value.map { pattern ->
            if (pattern.id == currentId) {
                clearedPatternName = pattern.name
                val clearedTracks = pattern.tracks.map { track ->
                    track.copy(steps = List(NUM_STEPS) { false })
                }
                pattern.copy(tracks = clearedTracks)
            } else {
                pattern
            }
        }
        if (_patterns.value != updatedPatterns) { // Check if a change actually happened
            _patterns.value = updatedPatterns
            PersistenceManager.savePatterns(app, _patterns.value)
            viewModelScope.launch {
                _uiEvents.emit("Pattern '$clearedPatternName' cleared")
            }
        }
    }

    override fun renamePattern(patternId: Int, newName: String) {
        var oldName = ""
        val updatedPatterns = _patterns.value.map {
            if (it.id == patternId) {
                oldName = it.name
                it.copy(name = newName)
            } else { it }
        }
        if (_patterns.value != updatedPatterns) {
            _patterns.value = updatedPatterns
            PersistenceManager.savePatterns(app, _patterns.value)
            viewModelScope.launch {
                _uiEvents.emit("Pattern '$oldName' renamed to '$newName'")
            }
        }
    }

    override fun deletePattern(patternId: Int) {
        val currentPatterns = _patterns.value
        val patternToRemove = currentPatterns.find { it.id == patternId } ?: return
        val deletedPatternName = patternToRemove.name

        _patterns.value = currentPatterns - patternToRemove
        PersistenceManager.savePatterns(app, _patterns.value)
        viewModelScope.launch {
            _uiEvents.emit("Pattern '$deletedPatternName' deleted")
        }

        if (_currentPatternId.value == patternId) {
            _currentPatternId.value = _patterns.value.firstOrNull()?.id
            PersistenceManager.saveString(app, PersistenceManager.KEY_CURRENT_PATTERN_ID, _currentPatternId.value?.toString())
        }
    }

    override fun createNewPattern() {
        val newId = (_patterns.value.maxOfOrNull { it.id } ?: 0) + 1
        val newPatternName = "Pattern $newId"
        val defaultTracksForNewPattern = listOf(
            Track(padId = 0, steps = List(NUM_STEPS) { false }),
            Track(padId = 1, steps = List(NUM_STEPS) { false })
        )
        val newPattern = Pattern(id = newId, name = newPatternName, tracks = defaultTracksForNewPattern)
        _patterns.value = _patterns.value + newPattern
        PersistenceManager.savePatterns(app, _patterns.value)
        _currentPatternId.value = newId
        PersistenceManager.saveString(app, PersistenceManager.KEY_CURRENT_PATTERN_ID, _currentPatternId.value?.toString())
        viewModelScope.launch {
            _uiEvents.emit("Pattern '$newPatternName' created")
        }
    }

    override fun saveCurrentAssignmentsAsKit(kitName: String) {
        val kitNameToSave = kitName.ifBlank { "Untitled Kit" }
        val currentPadSettingsMap = _pads.value.associate { pad ->
            pad.id to PadSettings(sampleId = pad.sampleId, volume = pad.volume, pitch = pad.pitch)
        }

        val newKit = DrumKit(
            id = UUID.randomUUID().toString(),
            name = kitNameToSave,
            padSettings = currentPadSettingsMap
        )
        _kits.value = _kits.value + newKit
        PersistenceManager.saveKits(app, _kits.value)
        selectKit(newKit.id) // This will also save the new activeKitId
        viewModelScope.launch {
            _uiEvents.emit("Kit '$kitNameToSave' saved")
        }
    }


    fun toggleRecording() {
        _isRecording.value = !_isRecording.value
    }

    fun recordPadTap(padId: Int) {
        if (_isPlaying.value && _isRecording.value) { // Check recording state as well
            val currentStep = _currentStepIndex.value
            activateStep(padId, currentStep)
        }
    }

    fun startPlayback() {
        _isPlaying.value = true
        // Sequencer loop is already running and will pick up the isPlaying state
    }

    fun stopPlayback() {
        _isPlaying.value = false
        // _isRecording.value = false // Optionally stop recording when playback stops
        _currentStepIndex.value = 0
    }

    private fun launchSequencerLoop() {
        sequencerJob?.cancel() // Cancel any existing job to avoid multiple loops if this function were called multiple times
        sequencerJob = viewModelScope.launch {
            while (true) { // Loop indefinitely
                val currentTempo = _tempo.value
                val msPerStep = calculateMillisecondsPerStep(currentTempo)

                if (_isPlaying.value) {
                    val currentStepVal = _currentStepIndex.value // For metronome logic

                    // Metronome click
                    if (_isMetronomeEnabled.value) {
                        // Play strong beat on 0, 4, 8, 12 (assuming 16 steps, STEPS_PER_BEAT = 4)
                        if (currentStepVal % STEPS_PER_BEAT == 0) {
                            audioPlayer.playSound("metronome_high", _metronomeVolume.value, 0.0f)
                        } else { // Other steps get a weaker beat or subdivision beat
                            audioPlayer.playSound("metronome_low", _metronomeVolume.value, 0.0f)
                        }
                    }

                    currentPattern.value?.let { pattern ->
                        // val step = _currentStepIndex.value // currentStepVal already has this
                        pattern.tracks.forEach { track ->
                            if (track.steps[currentStepVal]) {
                                val padToPlay = _pads.value.find { it.id == track.padId }
                                padToPlay?.sampleId?.let { sampleId ->
                                    audioPlayer.playSound(sampleId, padToPlay.volume, padToPlay.pitch)
                                }
                            }
                        }
                        _currentStepIndex.value = (currentStepVal + 1) % NUM_STEPS
                    } ?: run {
                        // No pattern selected or available, effectively pause by not processing steps
                        // but keep advancing step index if desired, or reset.
                        // For now, if no pattern, nothing happens.
                    }
                }
                delay(msPerStep)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        sequencerJob?.cancel()
    }
}
