interface BasePoint {
  x: number;
  y: number;
}

type Point = BasePoint &
  (
    | {
        heading: "linear";
        startDeg: number;
        endDeg: number;
        degrees?: never;
        reverse?: never;
      }
    | {
        heading: "constant";
        degrees: number;
        startDeg?: never;
        endDeg?: never;
        reverse?: never;
      }
    | {
        heading: "tangential";
        degrees?: never;
        startDeg?: never;
        endDeg?: never;
        reverse: boolean;
      }
  );

type ControlPoint = BasePoint;

interface Line {
  id: string;
  endPoint: Point;
  controlPoints: ControlPoint[];
  color: string;
  group: number;  // Group number for pathchain generation
  groupName: string;  // Name of the group for display and code generation
  name: string;  // Name of the line for display and code comments
  groupColor: string; // Primary color for the pathchain group
}
