import { createMemo, Show, createSignal } from "solid-js";
import { formatTime } from "../util";
import MarkerDetails from "./MarkerDetails";

export default (props) => {
  const markers = createMemo(() =>
    typeof props.duration === "number" ? props.markers.filter((m) => m[0] < props.duration) : [],
  );

  const isPastMarker = (m) =>
    typeof props.currentTime === "number" ? m[0] <= props.currentTime : false;

  const seekToMarker = (index) => {
    return (e) => {
      e.preventDefault();
      props.onSeekClick({ marker: index });
    };
  };

  const [selectedMarker, setSelectedMarker] = createSignal(null);

  // Create a reactive memo for the current marker based on playback position
  const currentMarker = createMemo(() => {
    if (typeof props.currentTime !== "number") return null;
    
    const currentTime = props.currentTime;
    let marker = null;
    
    // Find the most recent marker that has been passed
    for (let i = 0; i < markers().length; i++) {
      const m = markers()[i];
      if (m[0] <= currentTime) {
        marker = m;
      } else {
        break;
      }
    }
    
    return marker;
  });

  // Update selected marker when current marker changes
  createMemo(() => {
    const marker = currentMarker();
    if (marker) {
      setSelectedMarker(marker);
    }
  });

  return (
    <div class="ap-timeline">
      {/* <div class="ap-timeline-header">Marker Details</div> */}
      <div class="ap-timeline-container">
        <Show when={selectedMarker()}>
          <MarkerDetails marker={selectedMarker()} />
        </Show>
        <Show when={!selectedMarker()}>
          <div class="ap-no-marker">
            <p>No marker selected</p>
          </div>
        </Show>
      </div>
    </div>
  );
}; 