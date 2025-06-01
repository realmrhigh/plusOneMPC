package com.example.kotlindrummachine

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material.Button
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput

@Composable
fun DrumPadGrid(
    pads: List<Pad>,
    // audioPlayer: AudioPlayer, // No longer directly needed here if onPadClick handles sound
    onPadClick: (Pad) -> Unit,
    onPadLongClick: (Pad) -> Unit // New callback for long press
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(4), // Assuming 4 columns for the grid
        contentPadding = PaddingValues(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(pads.size) { index ->
            val pad = pads[index]
            // Using Box for more flexible click/long-press handling and appearance
            Box(
                modifier = Modifier
                    .size(80.dp)
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Color

@Composable
fun DrumPadGrid(
    pads: List<Pad>,
    // audioPlayer: AudioPlayer, // No longer directly needed here if onPadClick handles sound
    onPadClick: (Pad) -> Unit,
    onPadLongClick: (Pad) -> Unit // New callback for long press
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(4), // Assuming 4 columns for the grid
        contentPadding = PaddingValues(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(pads.size) { index ->
            val pad = pads[index]
            // Using Box for more flexible click/long-press handling and appearance
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(
                        MaterialTheme.colors.primary.copy(
                            alpha = if (pad.sampleId != null) 1.0f else 0.3f
                        ),
                        shape = RoundedCornerShape(8.dp) // Rounded corners
                    ) // Visual cue if pad has sample
                    .border(
                        BorderStroke(1.dp, Color.DarkGray.copy(alpha=0.7f)), // Border
                        shape = RoundedCornerShape(8.dp)
                    )
                    .pointerInput(pad) { // Use pad as key to recompose pointerInput if pad changes
                        detectTapGestures(
                            onTap = { onPadClick(pad) },
                            onLongPress = { onPadLongClick(pad) }
                        )
                    },
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                Column(horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
                    Text(
                        text = "Pad ${pad.id}",
                        color = MaterialTheme.colors.onPrimary
                    )
                    pad.sampleId?.let {
                        Text(
                            text = it.take(4), // Show first few chars of sample id
                            style = MaterialTheme.typography.caption,
                            color = MaterialTheme.colors.onPrimary.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }
    }
}
// No change needed for Preview as it's a visual tweak.
