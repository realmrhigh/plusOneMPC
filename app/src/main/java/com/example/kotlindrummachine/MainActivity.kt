package com.example.kotlindrummachine

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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

import android.app.Application
import androidx.lifecycle.ViewModelProvider
//import androidx.lifecycle.ViewModel // Will be replaced by specific import
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.material.Button
import androidx.compose.material.Slider
import androidx.compose.material.Switch // For Metronome Toggle
import androidx.compose.material.TextButton
import androidx.compose.material.AlertDialog
import androidx.compose.material.TextField
import androidx.compose.material.DropdownMenu
import androidx.compose.material.DropdownMenuItem
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
import androidx.lifecycle.ViewModel // Specific import
import androidx.lifecycle.viewModelScope // For this.viewModelScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.StateFlow // Ensure this is present
import kotlinx.coroutines.flow.combine // Ensure this is present
import kotlinx.coroutines.flow.mapLatest // Ensure this is present
import kotlinx.coroutines.flow.SharingStarted // Ensure this is present
import kotlinx.coroutines.flow.stateIn // Added for stateIn
import kotlinx.coroutines.launch // Ensure this is present for viewModelScope.launch
// PadSettings is likely in DataModels.kt, assuming it's available in the package
// import com.example.kotlindrummachine.PadSettings // Already available due to package structure or other imports


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

    // Hoisted state for various dialogs related to pattern management
    val showRenameDialog = rememberSaveable { mutableStateOf(false) }
    val renameText = rememberSaveable { mutableStateOf("") }
    val showClearPatternDialog = rememberSaveable { mutableStateOf(false) }
    val showDeleteDialog = rememberSaveable { mutableStateOf(false) }

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
                            val sourcePad = pads.find { it.id == levelsSourcePadId }
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
                Button(onClick = { showSaveKitDialog.value = true }, content = { Text("Save Kit") })

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
                                },
                                content = { Text("Save") }
                            )
                        },
                        dismissButton = {
                            Button(
                                onClick = { showSaveKitDialog.value = false },
                                content = { Text("Cancel") }
                            )
                        }
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
                    enabled = kits.indexOfFirst { it.id == activeKitId } > 0,
                    content = { Text("< Kit") }
                )
                Spacer(modifier = Modifier.width(8.dp))
                TextButton(
                    onClick = {
                        activeKitId?.let { akid ->
                            val currentIndex = kits.indexOfFirst { it.id == akid }
                            if (currentIndex < kits.size - 1) viewModel.selectKit(kits[currentIndex + 1].id)
                        }
                    },
                    enabled = kits.indexOfFirst { it.id == activeKitId } < kits.size - 1 && kits.isNotEmpty(),
                    content = { Text("Kit >") }
                )
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
                    enabled = (allPatterns.indexOfFirst { it.id == currentPattern?.id } > 0),
                    content = { Text("< Prev") }
                )

                // Rename Button
                Button(
                    onClick = {
                        currentPattern?.let {
                            renameText.value = it.name
                            showRenameDialog.value = true
                        }
                    },
                    enabled = currentPattern != null,
                    content = { Text("Rename") }
                )

                // New Pattern Button
                TextButton(
                    onClick = { viewModel.createNewPattern() },
                    content = { Text("New") }
                )

                // Clear Pattern Button
                Button(
                    onClick = {
                        if (currentPattern != null) showClearPatternDialog.value = true
                    },
                    enabled = currentPattern != null,
                    content = { Text("Clear") }
                )


                // Delete Button
                Button(
                    onClick = {
                        if (currentPattern != null) showDeleteDialog.value = true
                    },
                    enabled = currentPattern != null,
                    content = { Text("Delete") }
                )

                // Next Pattern Button
                TextButton(
                    onClick = {
                        currentPattern?.let { cp ->
                            val currentIndex = allPatterns.indexOfFirst { it.id == cp.id }
                            if (currentIndex < allPatterns.size - 1) viewModel.selectPattern(allPatterns[currentIndex + 1].id)
                        }
                    },
                    enabled = (allPatterns.indexOfFirst { it.id == currentPattern?.id } < allPatterns.size - 1 && allPatterns.isNotEmpty()),
                    content = { Text("Next >") }
                )
            }

            // Rename Dialog
            if (showRenameDialog.value) {
                AlertDialog(
                    onDismissRequest = { showRenameDialog.value = false },
                    title = { Text("Rename Pattern") },
                    text = { TextField(value = renameText.value, onValueChange = { renameText.value = it }, singleLine = true) },
                    confirmButton = {
                        Button(
                            onClick = { currentPattern?.let { viewModel.renamePattern(it.id, renameText.value) }; showRenameDialog.value = false },
                            content = { Text("Rename") }
                        )
                    },
                    dismissButton = {
                        Button(
                            onClick = { showRenameDialog.value = false },
                            content = { Text("Cancel") }
                        )
                    }
                )
            }

            // Delete Confirmation Dialog
            if (showDeleteDialog.value) {
                AlertDialog(
                    onDismissRequest = { showDeleteDialog.value = false },
                    title = { Text("Confirm Delete") },
                    text = { Text("Are you sure you want to delete '${currentPattern?.name}'?") },
                    confirmButton = {
                        Button(
                            onClick = { currentPattern?.let { viewModel.deletePattern(it.id) }; showDeleteDialog.value = false },
                            content = { Text("Delete") }
                        )
                    },
                    dismissButton = {
                        Button(
                            onClick = { showDeleteDialog.value = false },
                            content = { Text("Cancel") }
                        )
                    }
                )
            }

            // Clear Pattern Confirmation Dialog
            if (showClearPatternDialog.value) {
                AlertDialog(
                    onDismissRequest = { showClearPatternDialog.value = false },
                    title = { Text("Confirm Clear Pattern") },
                    text = { Text("Are you sure you want to clear all notes in '${currentPattern?.name ?: "this pattern"}'?") },
                    confirmButton = {
                        Button(
                            onClick = { viewModel.clearCurrentPattern(); showClearPatternDialog.value = false },
                            content = { Text("Clear") }
                        )
                    },
                    dismissButton = {
                        Button(
                            onClick = { showClearPatternDialog.value = false },
                            content = { Text("Cancel") }
                        )
                    }
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

@OptIn(ExperimentalCoroutinesApi::class)
@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
    val context = LocalContext.current
    val application = context.applicationContext as Application
    val previewAudioPlayer = AudioPlayer(context)

    class PreviewDrumMachineViewModel(application: Application, audioPlayer: AudioPlayer) : DrumMachineViewModel(application, audioPlayer) {
        // Properties: These are re-declared (hiding base class's) for the preview's distinct state. No 'override'.
        override val pads = MutableStateFlow(List(16) { Pad(it, null) }.apply { find {it.id == 0}?.sampleId = "kick"; find {it.id == 1}?.sampleId = "snare" }).asStateFlow()
        override val isPlaying = MutableStateFlow(false).asStateFlow()
        override val isRecording = MutableStateFlow(false).asStateFlow()
        override val currentStepIndex = MutableStateFlow(0).asStateFlow()

        private val _initialPatterns_preview = listOf(Pattern(1, "Pattern 1", listOf(
            Track(0, steps = List(NUM_STEPS){ it % 4 == 0}), // NUM_STEPS is from DrumMachineViewModel companion
            Track(1, steps = List(NUM_STEPS){(it + 2) % 4 == 0 })
        )))
        private val _patterns_preview = MutableStateFlow(_initialPatterns_preview)
        override val patterns = _patterns_preview.asStateFlow() // Hides DrumMachineViewModel.patterns

        private val _currentPatternId_preview = MutableStateFlow<Int?>(_initialPatterns_preview.firstOrNull()?.id)
        override val currentPatternId = _currentPatternId_preview.asStateFlow() // Hides DrumMachineViewModel.currentPatternId

        // This uses the local 'patterns' and 'currentPatternId' which are the preview versions.
        override val currentPattern: StateFlow<Pattern?> = combine(patterns, currentPatternId) { patternList, currentId ->
            patternList.find { it.id == currentId }
        }.stateIn(this.viewModelScope, SharingStarted.Lazily, _initialPatterns_preview.firstOrNull()) // Hides

        override val tempo = MutableStateFlow(120).asStateFlow() // Hides
        override val samples = MutableStateFlow(listOf(Sample("kick", "Kick", 0), Sample("snare", "Snare", 1))).asStateFlow() // Hides

        private val _defaultKit_preview = DrumKit(
            "default_kit_id_preview", "Default Kit Preview",
            mapOf(0 to PadSettings(sampleId = "kick"), 1 to PadSettings(sampleId = "snare"))
        )
        private val _kits_preview = MutableStateFlow(listOf(_defaultKit_preview))
        override val kits = _kits_preview.asStateFlow() // Hides

        private val _activeKitId_preview = MutableStateFlow<String?>(_defaultKit_preview.id)
        override val activeKitId = _activeKitId_preview.asStateFlow() // Hides

        override val activeKitName: StateFlow<String> = combine(kits, activeKitId) { kitList, currentId ->
             kitList.find { it.id == currentId }?.name ?: "No Kit Selected"
        }.stateIn(this.viewModelScope, SharingStarted.Lazily, "No Kit Selected") // Hides


        // --- Methods: Mark with 'override' ---
        override fun startPlayback() { /* Custom preview logic or remove if base is OK */ }
        override fun stopPlayback() { /* Custom preview logic */ }
        override fun toggleStep(padId: Int, stepIndex: Int) { /* Custom preview logic */ }
        override fun toggleRecording() { /* Custom preview logic */ }
        override fun recordPadTap(padId: Int) { /* Custom preview logic */ }
        override fun createNewPattern() {
            val newId = (_patterns_preview.value.maxOfOrNull { it.id } ?: 0) + 1
            val newPattern = Pattern(newId, "Pattern $newId", emptyList())
            _patterns_preview.value += newPattern
            _currentPatternId_preview.value = newId
            // super.createNewPattern() // Or call super if appropriate
        }
        override fun selectPattern(patternId: Int) { _currentPatternId_preview.value = patternId }
        override fun setTempo(newTempo: Int) { /* Custom preview logic */ } // tempo.value = newTempo if tempo is Mutable
        override fun renamePattern(patternId: Int, newName: String) {
             _patterns_preview.value = _patterns_preview.value.map {
                if (it.id == patternId) it.copy(name = newName) else it
            }
        }
        override fun deletePattern(patternId: Int) {
            _patterns_preview.value = _patterns_preview.value.filterNot { it.id == patternId }
            if (_currentPatternId_preview.value == patternId) {
                _currentPatternId_preview.value = _patterns_preview.value.firstOrNull()?.id
            }
        }
        override fun selectKit(kitId: String) { _activeKitId_preview.value = kitId }
        override fun saveCurrentAssignmentsAsKit(kitName: String) { /* Custom preview logic for kits_preview */ }
        override fun assignSampleToPad(padId: Int, newSampleId: String?) { /* Custom preview logic for pads.value */ }
        override fun setPadVolume(padId: Int, newVolume: Float) { /* Custom preview logic */ }
        override fun setPadPitch(padId: Int, newPitch: Float) { /* Custom preview logic */ }

        // Metronome related states and methods (hiding and overriding)
        private val _isMetronomeEnabled_preview = MutableStateFlow(false)
        override val isMetronomeEnabled = _isMetronomeEnabled_preview.asStateFlow() // Hides
        override fun toggleMetronome() { _isMetronomeEnabled_preview.value = !_isMetronomeEnabled_preview.value }

        private val _metronomeVolume_preview = MutableStateFlow(0.75f)
        override val metronomeVolume = _metronomeVolume_preview.asStateFlow() // Hides
        override fun setMetronomeVolume(newVolume: Float) { _metronomeVolume_preview.value = newVolume.coerceIn(0f, 1f) }


        // 16 Levels Preview States & Functions (hiding and overriding)
        private val _is16LevelsModeActive_preview = MutableStateFlow(false)
        override val is16LevelsModeActive = _is16LevelsModeActive_preview.asStateFlow() // Hides

        private val _levelsSourcePadId_preview = MutableStateFlow<Int?>(null)
        override val levelsSourcePadId = _levelsSourcePadId_preview.asStateFlow() // Hides

        private val _isSelectingLevelsSourcePad_preview = MutableStateFlow(false)
        override val isSelectingLevelsSourcePad = _isSelectingLevelsSourcePad_preview.asStateFlow() // Hides
        
        override val canSetSourcePad = pads.mapLatest { padList -> padList.any { it.sampleId != null } }.stateIn<Boolean>(this.viewModelScope, SharingStarted.Lazily, false) // Hides

        private val _uiEvents_preview = MutableSharedFlow<String>()
        override val uiEvents = _uiEvents_preview.asSharedFlow() // Hides


        override fun toggle16LevelsMode() { _is16LevelsModeActive_preview.value = !_is16LevelsModeActive_preview.value }
        override fun startSelectingLevelsSourcePad() { _isSelectingLevelsSourcePad_preview.value = true }
        override fun setLevelsSourcePad(padId: Int) {
            if (pads.value.find{ it.id == padId }?.sampleId != null) { // using local pads
                _levelsSourcePadId_preview.value = padId
                this.viewModelScope.launch { _uiEvents_preview.emit("Pad $padId set as 16 Levels source") }
            } else {
                this.viewModelScope.launch { _uiEvents_preview.emit("Pad $padId has no sample") }
            }
            _isSelectingLevelsSourcePad_preview.value = false
        }
        override fun clearCurrentPattern() {
            val currentId = _currentPatternId_preview.value ?: return
            _patterns_preview.value = _patterns_preview.value.map {
                if (it.id == currentId) it.copy(tracks = emptyList()) // Simplified clear
                else it
            }
        }
    }
    val previewViewModel = PreviewDrumMachineViewModel(application, previewAudioPlayer)

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
