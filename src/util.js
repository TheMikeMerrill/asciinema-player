function parseNpt(time) {
  if (typeof time === "number") {
    return time;
  } else if (typeof time === "string") {
    return time
      .split(":")
      .reverse()
      .map(parseFloat)
      .reduce((sum, n, i) => sum + n * Math.pow(60, i));
  } else {
    return undefined;
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);
  const paddedSeconds = seconds.toString().padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
}

function debounce(f, delay) {
  let timeout;

  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => f.apply(this, args), delay);
  };
}

function throttle(f, interval) {
  let enableCall = true;

  return function (...args) {
    if (!enableCall) return;

    enableCall = false;
    f.apply(this, args);
    setTimeout(() => (enableCall = true), interval);
  };
}

export { parseNpt, debounce, throttle, formatTime };
