import { createMemo, Show, createSignal, onMount } from "solid-js";
import { formatTime } from "../util";
import MarkerDetails from "./MarkerDetails";

export default (props) => {
  const [isVisible, setIsVisible] = createSignal(true);
  const [isTransitioning, setIsTransitioning] = createSignal(false);

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

  // Update selected marker when current marker changes with transition
  createMemo(() => {
    const marker = currentMarker();
    if (marker) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedMarker(marker);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 50); // Short delay to ensure the new content is rendered
      }, 300); // Match the CSS transition duration
    }
  });

  const toggleVisibility = () => {
    setIsVisible(!isVisible());
  };

  return (
    <div class="ap-timeline" classList={{ "ap-timeline-hidden": !isVisible() }}>
      <button class="ap-timeline-toggle" onClick={toggleVisibility} title={isVisible() ? "Hide sidebar" : "Show sidebar"}>
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d={isVisible() ? "M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" : "M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"} fill="currentColor"/>
        </svg>
      </button>
      <div class="ap-timeline-container" classList={{ "ap-transitioning": isTransitioning() }}>
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