package com.example.kotlindrummachine

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button // Added for Play/Stop, but not used in SequencerTrackView directly
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.tooling.preview.Preview

@Composable
fun SequencerTrackView(
    track: Track,
    currentStep: Int,
    isPlaying: Boolean, // To highlight current step only when playing
    onStepClick: (Int) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        (0 until DrumMachineViewModel.NUM_STEPS).forEach { stepIndex ->
            val isActive = track.steps[stepIndex]
            val isCurrent = stepIndex == currentStep && isPlaying

            val backgroundColor = when {
                isActive && isCurrent -> Color.Yellow // Active and current step
                isActive -> Color.Green
                isCurrent -> Color.Magenta // Current step but not active (for visual feedback)
                else -> Color.LightGray.copy(alpha = 0.5f)
            }

            Box(
                modifier = Modifier
                    .weight(1f)
                    .aspectRatio(1f) // Make it square
                    .background(backgroundColor)
                    .border(
                        width = if (isCurrent) 2.dp else 1.dp,
                        color = if (isCurrent) Color.White else Color.Gray
                    )
                    .clickable { onStepClick(stepIndex) }
                    .padding(2.dp), // Padding for text if any, or just for visual separation
                contentAlignment = Alignment.Center
            ) {
                // Text("${stepIndex + 1}") // Optional: show step number
            }
        }
    }
}

@Composable
fun SequencerView(viewModel: DrumMachineViewModel) {
    val currentPatternOpt by viewModel.currentPattern.collectAsState() // This is now StateFlow<Pattern?>
    val currentStepIndex by viewModel.currentStepIndex.collectAsState()
    val isPlaying by viewModel.isPlaying.collectAsState()
    val samples by viewModel.samples.collectAsState() // For track names
    val pads by viewModel.pads.collectAsState() // For mapping padId to sampleId to sample name

    Column(modifier = Modifier.padding(8.dp)) {
        Text(
            "Sequencer: ${currentPatternOpt?.name ?: "No Pattern Selected"}",
            style = MaterialTheme.typography.h6
        )
        Spacer(modifier = Modifier.height(8.dp))

        currentPatternOpt?.let { currentPattern ->
            if (currentPattern.tracks.isEmpty() && pads.any{it.sampleId != null}) {
                 Text("Pattern is empty. Tap pads while recording or toggle steps to add notes.",
                     modifier = Modifier.padding(16.dp).align(Alignment.CenterHorizontally)
                 )
            } else if (pads.none{it.sampleId != null}) {
                 Text("No samples loaded onto pads.",
                     modifier = Modifier.padding(16.dp).align(Alignment.CenterHorizontally)
                 )
            }
            else {
                // Display tracks for all pads that have samples assigned
                pads.filter { it.sampleId != null }.sortedBy { it.id }.forEach { pad ->
                    val track = currentPattern.tracks.find { it.padId == pad.id }
                    val sample = samples.find { it.id == pad.sampleId }
                    val trackName = sample?.name ?: "Pad ${pad.id}"

                    // Ensure a track object exists for view, even if empty
                    val trackToView = track ?: Track(padId = pad.id, steps = List(DrumMachineViewModel.NUM_STEPS) { false })

                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical=4.dp)) {
                        Text(trackName, modifier = Modifier.width(80.dp), style = MaterialTheme.typography.caption)
                        SequencerTrackView(
                            track = trackToView,
                            currentStep = currentStepIndex,
                            isPlaying = isPlaying,
                            onStepClick = { stepIndex -> viewModel.toggleStep(pad.id, stepIndex) }
                        )
                    }
                }
            }
        } ?: run {
            Text("Select or create a pattern to start.",
                modifier = Modifier.padding(16.dp).align(Alignment.CenterHorizontally)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SequencerTrackViewPreview() {
    val sampleTrack = Track(padId = 0, steps = MutableList(16) { it % 2 == 0 })
    Column {
        SequencerTrackView(track = sampleTrack, currentStep = 0, isPlaying = true, onStepClick = {})
        SequencerTrackView(track = sampleTrack, currentStep = 3, isPlaying = true, onStepClick = {})
        SequencerTrackView(track = sampleTrack, currentStep = 0, isPlaying = false, onStepClick = {})
    }
}
// Preview for SequencerView would require a mock ViewModel and AudioPlayer.
// Consider adding if time permits and it's crucial.
