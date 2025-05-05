export function quadraticToCubic(
  P0: BasePoint,
  P1: BasePoint,
  P2: BasePoint
): { Q1: BasePoint; Q2: BasePoint } {
  const Q1 = {
    x: P0.x + (2 / 3) * (P1.x - P0.x),
    y: P0.y + (2 / 3) * (P1.y - P0.y),
  };

  const Q2 = {
    x: P2.x + (2 / 3) * (P1.x - P2.x),
    y: P2.y + (2 / 3) * (P1.y - P2.y),
  };

  return { Q1, Q2 };
}

export function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function getMousePos(evt: MouseEvent, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  return { x, y };
}

export function vh(percent: number) {
  var h = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
  );
  return (percent * h) / 100;
}

export function vw(percent: number) {
  var w = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth || 0
  );
  return (percent * w) / 100;
}

export function transformAngle(angle: number) {
  return ((angle + 180) % 360) - 180;
}

export function shortestRotation(
  startAngle: number,
  endAngle: number,
  percentage: number
) {
  // Normalize the angles to the range 0 to 360
  startAngle = (startAngle + 360) % 360;
  endAngle = (endAngle + 360) % 360;

  // Calculate the difference between the angles
  let difference = endAngle - startAngle;

  // Adjust the difference to take the shortest path
  if (difference > 180) {
    difference -= 360;
  } else if (difference < -180) {
    difference += 360;
  }

  // Calculate the interpolated angle
  let result = startAngle + difference * percentage;

  // Normalize the result to the range 0 to 360
  return result;
}

export function radiansToDegrees(radians: number) {
  return radians * (180 / Math.PI);
}

export function lerp(ratio: number, start: number, end: number) {
  return start + (end - start) * ratio;
}

export function lerp2d(ratio: number, start: BasePoint, end: BasePoint) {
  return {
    x: lerp(ratio, start.x, end.x),
    y: lerp(ratio, start.y, end.y)
  };
}

export function getCurvePoint(t: number, points: BasePoint[]): BasePoint {
  if (points.length === 1) return points[0];
  var newpoints = [];
  for (var i = 0, j = 1; j < points.length; i++, j++) {
    newpoints[i] = lerp2d(t, points[i], points[j]);
  }
  return getCurvePoint(t,newpoints);
}
