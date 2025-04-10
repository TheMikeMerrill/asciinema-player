import { createMemo, Show, onMount, onCleanup } from "solid-js";

export default (props) => {
  // Create a reactive memo that depends on the marker prop
  const markerDetails = createMemo(() => {
    if (!props.marker || !props.marker[1]) return null;
    
    try {
      // Try to parse the JSON string if it exists
      const jsonStr = props.marker[1];
      if (typeof jsonStr === 'string' && jsonStr.startsWith('{')) {
        return JSON.parse(jsonStr);
      }
      return null;
    } catch (e) {
      console.error("Failed to parse marker JSON:", e);
      return null;
    }
  });

  // Log when the marker changes for debugging
  onMount(() => {
    console.log("MarkerDetails mounted with marker:", props.marker);
  });

  return (
    <div class="ap-marker-details">
      <Show when={markerDetails()}>
        <div class="ap-marker-details-content">
          <div class="ap-marker-header">
            <h3>Agent Details</h3>
          </div>
          
          <div class="ap-marker-section">
            <h4>State Analysis</h4>
            <p>{markerDetails()?.state_analysis}</p>
          </div>
          
          <Show when={markerDetails()?.explanation}>
            <div class="ap-marker-section">
              <h4>Explanation</h4>
              <p>{markerDetails()?.explanation}</p>
            </div>
          </Show>
          
          <Show when={markerDetails()?.commands && markerDetails()?.commands.length > 0}>
            <div class="ap-marker-section">
              <h4>Commands</h4>
              <ul>
                {markerDetails()?.commands.map(cmd => (
                  <li>
                    <code>{cmd.keystrokes}</code>
                    <div class="ap-marker-command-meta">
                      <Show when={cmd.is_blocking}>
                        <span class="ap-marker-command-blocking">Blocking</span>
                      </Show>
                      <Show when={cmd.timeout_sec}>
                        <span class="ap-marker-command-timeout">Timeout: {cmd.timeout_sec}s</span>
                      </Show>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}; 