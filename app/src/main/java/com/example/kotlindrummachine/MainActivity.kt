package com.example.kotlindrummachine

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.kotlindrummachine.ui.theme.KotlinDrumMachineTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.ViewModel
import android.app.Application
import androidx.lifecycle.ViewModelProvider
import androidx.compose.material.Button
import androidx.compose.material.Slider
import androidx.compose.material.Switch // For Metronome Toggle
import androidx.compose.material.TextButton
import androidx.compose.material.AlertDialog
import androidx.compose.material.TextField
import androidx.compose.material.DropdownMenu
import androidx.compose.material.DropdownMenuItem
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.platform.LocalContext // For Toasts
import android.widget.Toast // For Toasts
import androidx.compose.material.ButtonDefaults // For button colors
import kotlinx.coroutines.flow.MutableSharedFlow // For Preview uiEvents
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.asSharedFlow // For Preview uiEvents
import java.util.UUID


// Custom ViewModel Factory for AndroidViewModel
class DrumMachineViewModelFactory(
    private val application: Application,
    private val audioPlayer: AudioPlayer
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(DrumMachineViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return DrumMachineViewModel(application, audioPlayer) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}

class MainActivity : ComponentActivity() {
    private lateinit var audioPlayer: AudioPlayer
    private val drumMachineViewModel: DrumMachineViewModel by viewModels {
        DrumMachineViewModelFactory(application, audioPlayer) // Pass application to factory
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        audioPlayer = AudioPlayer(applicationContext)

        setContent {
            KotlinDrumMachineTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colors.background
                ) {
                    // ViewModel is now an AndroidViewModel and gets application context via factory
                    // AudioPlayer is initialized and passed.
                    // Samples are loaded by AudioPlayer's init or a dedicated load function if called.
                    // ViewModel's init now handles loading persisted data.

                    LaunchedEffect(key1 = Unit) { // Standard way to load samples if not in init
                         // audioPlayer.loadSamples() // If still needed explicitly; AudioPlayer loads them in its init.
                         // ViewModel init should be loading things now.
                    }

                    val padsState by drumMachineViewModel.pads.collectAsState()
                    val isPlaying by drumMachineViewModel.isPlaying.collectAsState()
                    val isRecording by drumMachineViewModel.isRecording.collectAsState()
                    val currentStep by drumMachineViewModel.currentStepIndex.collectAsState()
                    val currentPattern by drumMachineViewModel.currentPattern.collectAsState()
                    val allPatterns by drumMachineViewModel.patterns.collectAsState()
                    val tempo by drumMachineViewModel.tempo.collectAsState()
                    // Kit states
                    val kits by drumMachineViewModel.kits.collectAsState()
                    val activeKitId by drumMachineViewModel.activeKitId.collectAsState()
                    val activeKitName by drumMachineViewModel.activeKitName.collectAsState()
                    // Metronome states
                    val isMetronomeEnabled by drumMachineViewModel.isMetronomeEnabled.collectAsState()
                    val metronomeVolume by drumMachineViewModel.metronomeVolume.collectAsState()
                    // 16 Levels states
                    val is16LevelsModeActive by drumMachineViewModel.is16LevelsModeActive.collectAsState()
                    val levelsSourcePadId by drumMachineViewModel.levelsSourcePadId.collectAsState()
                    val isSelectingLevelsSourcePad by drumMachineViewModel.isSelectingLevelsSourcePad.collectAsState()
                    val canSetSourcePad by drumMachineViewModel.canSetSourcePad.collectAsState() // Collect new state


                    DrumMachineApp(
                        audioPlayer = audioPlayer,
                        pads = padsState,
                        viewModel = drumMachineViewModel,
                        isPlaying = isPlaying,
                        isRecording = isRecording,
                        currentStep = currentStep,
                        currentPattern = currentPattern,
                        allPatterns = allPatterns,
                        tempo = tempo,
                        kits = kits,
                        activeKitId = activeKitId,
                        activeKitName = activeKitName,
                        samples = drumMachineViewModel.samples.collectAsState().value,
                        isMetronomeEnabled = isMetronomeEnabled,
                        metronomeVolume = metronomeVolume,
                        is16LevelsModeActive = is16LevelsModeActive,
                        levelsSourcePadId = levelsSourcePadId,
                        isSelectingLevelsSourcePad = isSelectingLevelsSourcePad,
                        canSetSourcePad = canSetSourcePad // Pass new state
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        audioPlayer.release()
    }
}

@Composable
fun DrumMachineApp(
    audioPlayer: AudioPlayer, // Kept for direct pad interaction if needed
    pads: List<Pad>,
    viewModel: DrumMachineViewModel,
    isPlaying: Boolean,
    isRecording: Boolean,
    currentStep: Int,
    currentPattern: Pattern?,
    allPatterns: List<Pattern>,
    tempo: Int,
    kits: List<DrumKit>,
    activeKitId: String?,
    activeKitName: String,
    samples: List<Sample>,
    isMetronomeEnabled: Boolean,
    metronomeVolume: Float,
    is16LevelsModeActive: Boolean,
    levelsSourcePadId: Int?,
    isSelectingLevelsSourcePad: Boolean,
    canSetSourcePad: Boolean // Receive new state
) {
    val showPadEditDialog = rememberSaveable { mutableStateOf(false) }
    val editingPad = remember { mutableStateOf<Pad?>(null) }
    val showSampleSelectDialog = remember { mutableStateOf(false) }
    val context = LocalContext.current

    LaunchedEffect(key1 = viewModel.uiEvents) {
        viewModel.uiEvents.collect { message ->
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Kotlin Drum Machine",
            style = MaterialTheme.typography.h5,
            modifier = Modifier.padding(16.dp)
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(250.dp) // Adjusted height for DrumPadGrid
                .background(Color.LightGray)
        ) {
            // DrumPadGrid's onClick is implicitly handled by how it's called if it directly uses ViewModel
            // or by passing a lambda that has access to the ViewModel.
            // The current DrumPadGrid takes pads and audioPlayer.
            // We will modify its invocation or structure if direct ViewModel interaction for clicks is needed.
            // For now, let's assume pad click logic is handled where DrumPadGrid is used or modified.
            DrumPadGrid(
                pads = pads,
                onPadClick = { pad ->
                    when {
                        isSelectingLevelsSourcePad -> {
                            viewModel.setLevelsSourcePad(pad.id)
                            // Confirmation sound is played if source is valid (handled by VM event or direct feedback)
                        }
                        is16LevelsModeActive && levelsSourcePadId != null -> {
                            val sourcePadActualId = levelsSourcePadId
                            val sourcePad = pads.find { it.id == sourcePadActualId }
                            if (sourcePad?.sampleId != null) {
                                val pitchOffset = pad.id - 8
                                audioPlayer.playSound(
                                    sourcePad.sampleId!!,
                                    sourcePad.volume,
                                    sourcePad.pitch + pitchOffset
                                )
                            }
                        }
                        else -> {
                            pad.sampleId?.let { sampleId ->
                                audioPlayer.playSound(sampleId, pad.volume, pad.pitch)
                            }
                            if (viewModel.isRecording.value && viewModel.isPlaying.value) {
                                viewModel.recordPadTap(pad.id)
                            }
                        }
                    }
                },
                onPadLongClick = { pad ->
                    if (!isSelectingLevelsSourcePad && !is16LevelsModeActive) {
                        editingPad.value = pad
                        showPadEditDialog.value = true
                    }
                }
            )
        }

        SequencerView(viewModel = viewModel)

        // Pad Edit Dialog
        if (showPadEditDialog.value && editingPad.value != null) {
            val currentEditingPad = editingPad.value!! // Safe due to check

            AlertDialog(
                onDismissRequest = { showPadEditDialog.value = false },
                title = { Text("Edit Pad ${currentEditingPad.id}") },
                text = {
                    Column {
                        // Sample Selection
                        Text("Sample: ${currentEditingPad.sampleId ?: "None"}")
                        Button(onClick = { showSampleSelectDialog.value = true }) {
                            Text("Change Sample")
                        }
                        DropdownMenu(
                            expanded = showSampleSelectDialog.value,
                            onDismissRequest = { showSampleSelectDialog.value = false }
                        ) {
                            samples.forEach { sample ->
                                DropdownMenuItem(onClick = {
                                    viewModel.assignSampleToPad(currentEditingPad.id, sample.id)
                                    editingPad.value = currentEditingPad.copy(sampleId = sample.id) // Update local state
                                    showSampleSelectDialog.value = false
                                }) {
                                    Text(sample.name)
                                }
                            }
                            DropdownMenuItem(onClick = { // Option to clear sample
                                viewModel.assignSampleToPad(currentEditingPad.id, null)
                                editingPad.value = currentEditingPad.copy(sampleId = null)
                                showSampleSelectDialog.value = false
                            }) {
                                Text("None (Clear Sample)")
                            }
                        }
                        Spacer(modifier = Modifier.height(16.dp))

                        // Volume Slider
                        Text("Volume: ${String.format("%.2f", currentEditingPad.volume)}")
                        Slider(
                            value = currentEditingPad.volume,
                            onValueChange = { newVolume ->
                                viewModel.setPadVolume(currentEditingPad.id, newVolume)
                                editingPad.value = currentEditingPad.copy(volume = newVolume)
                            },
                            valueRange = 0f..1f
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        // Pitch Slider
                        Text("Pitch: ${String.format("%.1f", currentEditingPad.pitch)} semitones")
                        Slider(
                            value = currentEditingPad.pitch,
                            onValueChange = { newPitch ->
                                viewModel.setPadPitch(currentEditingPad.id, newPitch)
                                editingPad.value = currentEditingPad.copy(pitch = newPitch)
                            },
                            valueRange = -12f..12f,
                            steps = 23 // (12 - (-12)) / 1 step = 24 steps, so 23 intermediate points
                        )
                    }
                },
                confirmButton = {
                    Button(onClick = { showPadEditDialog.value = false }) { Text("Done") }
                }
            )
        }

        // Pattern, Kit, and Tempo Controls Section
        Column(modifier = Modifier.padding(horizontal = 8.dp)) {
            // Active Kit Display
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Active Kit: $activeKitName", style = MaterialTheme.typography.subtitle1, modifier = Modifier.weight(1f))
                val showSaveKitDialog = rememberSaveable { mutableStateOf(false) }
                val newKitName = rememberSaveable { mutableStateOf("") }
                Button(onClick = { showSaveKitDialog.value = true }) { Text("Save Kit") }

                if (showSaveKitDialog.value) {
                    AlertDialog(
                        onDismissRequest = { showSaveKitDialog.value = false },
                        title = { Text("Save Drum Kit") },
                        text = {
                            TextField(
                                value = newKitName.value,
                                onValueChange = { newKitName.value = it },
                                label = { Text("Kit Name") },
                                singleLine = true
                            )
                        },
                        confirmButton = {
                            Button(
                                onClick = {
                                    viewModel.saveCurrentAssignmentsAsKit(newKitName.value.ifBlank { "Untitled Kit" })
                                    showSaveKitDialog.value = false
                                }
                            ) { Text("Save") }
                        },
                        dismissButton = { Button(onClick = { showSaveKitDialog.value = false }) { Text("Cancel") } }
                    )
                }
            }
            // Kit Selection Row
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 2.dp),
                horizontalArrangement = Arrangement.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = {
                        activeKitId?.let { akid ->
                            val currentIndex = kits.indexOfFirst { it.id == akid }
                            if (currentIndex > 0) viewModel.selectKit(kits[currentIndex - 1].id)
                        }
                    },
                    enabled = kits.indexOfFirst { it.id == activeKitId } > 0
                ) { Text("< Kit") }
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(
                    onClick = {
                        activeKitId?.let { akid ->
                            val currentIndex = kits.indexOfFirst { it.id == akid }
                            if (currentIndex < kits.size - 1) viewModel.selectKit(kits[currentIndex + 1].id)
                        }
                    },
                    enabled = kits.indexOfFirst { it.id == activeKitId } < kits.size - 1 && kits.isNotEmpty()
                ) { Text("Kit >") }
            }


            // Pattern Controls Row (existing)
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Pattern: ${currentPattern?.name ?: "N/A"}", style = MaterialTheme.typography.h6, modifier = Modifier.weight(1f))
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround, // Adjusted for more buttons
                verticalAlignment = Alignment.CenterVertically
            ){
                // Previous Pattern Button
                TextButton(
                    onClick = {
                        currentPattern?.let { cp ->
                            val currentIndex = allPatterns.indexOfFirst { it.id == cp.id }
                            if (currentIndex > 0) viewModel.selectPattern(allPatterns[currentIndex - 1].id)
                        }
                    },
                    enabled = (allPatterns.indexOfFirst { it.id == currentPattern?.id } > 0)
                ) { Text("< Prev") }

                // Rename Button
                val showRenameDialog = rememberSaveable { mutableStateOf(false) }
                val renameText = rememberSaveable { mutableStateOf("") }
                Button(onClick = {
                    currentPattern?.let {
                        renameText.value = it.name
                        showRenameDialog.value = true
                    }
                }, enabled = currentPattern != null) { Text("Rename") }

                // New Pattern Button
                TextButton(
                    onClick = { viewModel.createNewPattern() }
                ) { Text("New") }

                // Clear Pattern Button
                val showClearPatternDialog = rememberSaveable { mutableStateOf(false) }
                Button(onClick = {
                    if (currentPattern != null) showClearPatternDialog.value = true
                }, enabled = currentPattern != null) { Text("Clear") }


                // Delete Button
                val showDeleteDialog = rememberSaveable { mutableStateOf(false) }
                Button(onClick = {
                    if (currentPattern != null) showDeleteDialog.value = true
                }, enabled = currentPattern != null) { Text("Delete") }

                // Next Pattern Button
                TextButton(
                        onClick = {
                            currentPattern?.let { cp ->
                                val currentIndex = allPatterns.indexOfFirst { it.id == cp.id }
                                if (currentIndex < allPatterns.size - 1) viewModel.selectPattern(allPatterns[currentIndex + 1].id)
                            }
                        },
                        enabled = (allPatterns.indexOfFirst { it.id == currentPattern?.id } < allPatterns.size - 1 && allPatterns.isNotEmpty())
                    ) { Text("Next >") }
            }

            // Rename Dialog
            if (showRenameDialog.value) {
                AlertDialog(
                    onDismissRequest = { showRenameDialog.value = false },
                    title = { Text("Rename Pattern") },
                    text = { TextField(value = renameText.value, onValueChange = { renameText.value = it }, singleLine = true) },
                    confirmButton = {
                        Button(onClick = { currentPattern?.let { viewModel.renamePattern(it.id, renameText.value) }; showRenameDialog.value = false }) { Text("Rename") }
                    },
                    dismissButton = { Button(onClick = { showRenameDialog.value = false }) { Text("Cancel") } }
                )
            }

            // Delete Confirmation Dialog
            if (showDeleteDialog.value) {
                AlertDialog(
                    onDismissRequest = { showDeleteDialog.value = false },
                    title = { Text("Confirm Delete") },
                    text = { Text("Are you sure you want to delete '${currentPattern?.name}'?") },
                    confirmButton = {
                        Button(onClick = { currentPattern?.let { viewModel.deletePattern(it.id) }; showDeleteDialog.value = false }) { Text("Delete") }
                    },
                    dismissButton = { Button(onClick = { showDeleteDialog.value = false }) { Text("Cancel") } }
                )
            }

            // Clear Pattern Confirmation Dialog
            if (showClearPatternDialog.value) {
                AlertDialog(
                    onDismissRequest = { showClearPatternDialog.value = false },
                    title = { Text("Confirm Clear Pattern") },
                    text = { Text("Are you sure you want to clear all notes in '${currentPattern?.name ?: "this pattern"}'?") },
                    confirmButton = {
                        Button(onClick = { viewModel.clearCurrentPattern(); showClearPatternDialog.value = false }) { Text("Clear") }
                    },
                    dismissButton = { Button(onClick = { showClearPatternDialog.value = false }) { Text("Cancel") } }
                )
            }


             // 16 Levels Controls Row
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp, horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                Button(onClick = { viewModel.toggle16LevelsMode() }) {
                    Text(if (is16LevelsModeActive) "Exit 16 Levels" else "16 Levels")
                }
                Button(
                    onClick = { viewModel.startSelectingLevelsSourcePad() },
                    enabled = is16LevelsModeActive && canSetSourcePad,
                    colors = ButtonDefaults.buttonColors(
                        backgroundColor = if (isSelectingLevelsSourcePad) Color.Yellow
                                        else MaterialTheme.colors.secondary
                    )
                ) {
                    Text(
                        if (isSelectingLevelsSourcePad) "Tap Pad..."
                        else if (is16LevelsModeActive && !canSetSourcePad) "No Samples"
                        else "Set Source"
                    )
                }
                val sourcePadInfo = levelsSourcePadId?.let { srcId ->
                    pads.find { it.id == srcId }?.let {
                        "Src: ${it.sampleId?.take(4) ?: "P${it.id}"}"
                    } ?: "Src: P$srcId"
                } ?: "Src: None"
                Text(sourcePadInfo, style = MaterialTheme.typography.body2)
            }


            // Metronome Controls Row (existing)
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 8.dp)) {
                    Switch(
                        checked = isMetronomeEnabled,
                        onCheckedChange = { viewModel.toggleMetronome() }
                    )
                    Text("Metronome", style = MaterialTheme.typography.body2, modifier = Modifier.padding(start = 4.dp, end = 8.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f).padding(end=8.dp)) {
                     Slider(
                        value = metronomeVolume,
                        onValueChange = { viewModel.setMetronomeVolume(it) },
                        valueRange = 0f..1f,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = "${(metronomeVolume * 100).toInt()}%",
                        style = MaterialTheme.typography.caption,
                        modifier = Modifier.width(40.dp).padding(start = 4.dp)
                    )
                }
            }
        }


        // Transport Controls Row (existing)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp)
                .height(60.dp) // Adjusted height
                .background(Color.DarkGray),
            horizontalArrangement = Arrangement.SpaceEvenly, // Keeps original spacing for main controls
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(onClick = { viewModel.startPlayback() }, enabled = !isPlaying) { Text("Play") }
            Button(onClick = { viewModel.stopPlayback() }, enabled = isPlaying) { Text("Stop") }
            Button(
                onClick = { viewModel.toggleRecording() },
                colors = androidx.compose.material.ButtonDefaults.buttonColors(
                    backgroundColor = if (isRecording) Color.Red else MaterialTheme.colors.secondary
                )
            ) { Text("Record") }
            Text("Step: ${currentStep + 1}", color = Color.White, style = MaterialTheme.typography.body1)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val previewAudioPlayer = AudioPlayer(context)

    class PreviewDrumMachineViewModel(audioPlayer: AudioPlayer) : ViewModel() {
        val pads = MutableStateFlow(List(16) { Pad(it, null) }.apply { find {it.id == 0}?.sampleId = "kick"; find {it.id == 1}?.sampleId = "snare" }).asStateFlow()
        val isPlaying = MutableStateFlow(false).asStateFlow()
        val isRecording = MutableStateFlow(false).asStateFlow()
        val currentStepIndex = MutableStateFlow(0).asStateFlow()

        private val _initialPatterns = listOf(Pattern(1, "Pattern 1", listOf(
            Track(0, steps = List(DrumMachineViewModel.NUM_STEPS){ it % 4 == 0}),
            Track(1, steps = List(DrumMachineViewModel.NUM_STEPS){(it + 2) % 4 == 0 })
        )))
        private val _patterns = MutableStateFlow(_initialPatterns)
        val patterns = _patterns.asStateFlow()
        private val _currentPatternId = MutableStateFlow<Int?>(_initialPatterns.firstOrNull()?.id)
        val currentPatternId = _currentPatternId.asStateFlow()
        val currentPattern: StateFlow<Pattern?> = combine(patterns, currentPatternId) { patternList, currentId ->
            patternList.find { it.id == currentId }
        }.stateIn(viewModelScope, SharingStarted.Lazily, _initialPatterns.firstOrNull())

        val tempo = MutableStateFlow(120).asStateFlow()
        val samples = MutableStateFlow(listOf(Sample("kick", "Kick", 0), Sample("snare", "Snare", 1))).asStateFlow()

        // Kit related states for preview
        private val _defaultKit = DrumKit("default_kit_id", "Default Kit", mapOf(0 to "kick", 1 to "snare"))
        private val _kits = MutableStateFlow(listOf(_defaultKit))
        val kits = _kits.asStateFlow()
        private val _activeKitId = MutableStateFlow<String?>(_defaultKit.id)
        val activeKitId = _activeKitId.asStateFlow()
        val activeKitName: StateFlow<String> = combine(kits, activeKitId) { kitList, currentId ->
             kitList.find { it.id == currentId }?.name ?: "No Kit Selected"
        }.stateIn(viewModelScope, SharingStarted.Lazily, "No Kit Selected")


        fun startPlayback() {}
        fun stopPlayback() {}
        fun toggleStep(padId: Int, stepIndex: Int) {}
        fun toggleRecording() {}
        fun recordPadTap(padId: Int) {}
        fun createNewPattern() { /* ... */ }
        fun selectPattern(patternId: Int) { _currentPatternId.value = patternId }
        fun setTempo(newTempo: Int) {}
        fun renamePattern(patternId: Int, newName: String) { /* ... */ }
        fun deletePattern(patternId: Int) { /* ... */ }
        fun selectKit(kitId: String) { _activeKitId.value = kitId }
        fun saveCurrentAssignmentsAsKit(kitName: String) { /* ... */ }
        fun assignSampleToPad(padId: Int, sampleId: String?) { /* ... */ }
        fun setPadVolume(padId: Int, volume: Float) { /* ... */ }
        fun setPadPitch(padId: Int, pitch: Float) { /* ... */ }
        fun toggleMetronome() { _isMetronomeEnabled.value = !_isMetronomeEnabled.value }
        fun setMetronomeVolume(vol: Float) { _metronomeVolume.value = vol }

        private val _isMetronomeEnabled = MutableStateFlow(false)
        val isMetronomeEnabled = _isMetronomeEnabled.asStateFlow()
        private val _metronomeVolume = MutableStateFlow(0.75f)
        val metronomeVolume = _metronomeVolume.asStateFlow()

        // 16 Levels Preview States & Functions
        private val _is16LevelsModeActive = MutableStateFlow(false)
        val is16LevelsModeActive = _is16LevelsModeActive.asStateFlow()
        private val _levelsSourcePadId = MutableStateFlow<Int?>(null)
        val levelsSourcePadId = _levelsSourcePadId.asStateFlow()
        private val _isSelectingLevelsSourcePad = MutableStateFlow(false)
        val isSelectingLevelsSourcePad = _isSelectingLevelsSourcePad.asStateFlow()

        fun toggle16LevelsMode() { _is16LevelsModeActive.value = !_is16LevelsModeActive.value }
        fun startSelectingLevelsSourcePad() { _isSelectingLevelsSourcePad.value = true }
        fun setLevelsSourcePad(padId: Int) {
            if (pads.value.find{ it.id == padId }?.sampleId != null) {
                _levelsSourcePadId.value = padId
                viewModelScope.launch { _uiEvents.emit("Pad $padId set as 16 Levels source") }
            } else {
                viewModelScope.launch { _uiEvents.emit("Pad $padId has no sample") }
            }
            _isSelectingLevelsSourcePad.value = false
        }
        fun clearCurrentPattern() { /* ... */ }

        val canSetSourcePad = pads.mapLatest { padList -> padList.any { it.sampleId != null } }.stateIn(viewModelScope, SharingStarted.Lazily, false)
        private val _uiEvents = MutableSharedFlow<String>()
        val uiEvents = _uiEvents.asSharedFlow()
    }
    val previewViewModel = PreviewDrumMachineViewModel(previewAudioPlayer)

    KotlinDrumMachineTheme {
        DrumMachineApp(
            audioPlayer = previewAudioPlayer,
            pads = previewViewModel.pads.collectAsState().value,
            viewModel = previewViewModel,
            isPlaying = previewViewModel.isPlaying.collectAsState().value,
            isRecording = previewViewModel.isRecording.collectAsState().value,
            currentStep = previewViewModel.currentStepIndex.collectAsState().value,
            currentPattern = previewViewModel.currentPattern.collectAsState().value,
            allPatterns = previewViewModel.patterns.collectAsState().value,
            tempo = previewViewModel.tempo.collectAsState().value,
            kits = previewViewModel.kits.collectAsState().value,
            activeKitId = previewViewModel.activeKitId.collectAsState().value,
            activeKitName = previewViewModel.activeKitName.collectAsState().value,
            samples = previewViewModel.samples.collectAsState().value,
            isMetronomeEnabled = previewViewModel.isMetronomeEnabled.collectAsState().value,
            metronomeVolume = previewViewModel.metronomeVolume.collectAsState().value,
            is16LevelsModeActive = previewViewModel.is16LevelsModeActive.collectAsState().value,
            levelsSourcePadId = previewViewModel.levelsSourcePadId.collectAsState().value,
            isSelectingLevelsSourcePad = previewViewModel.isSelectingLevelsSourcePad.collectAsState().value,
            canSetSourcePad = previewViewModel.canSetSourcePad.collectAsState().value // Pass for preview
        )
    }
}
