<script lang="ts">
  import * as d3 from "d3";
  import { onMount } from "svelte";
  import Two from "two.js";
  import type { Path } from "two.js/src/path";
  import type { Line as PathLine } from "two.js/src/shapes/line";
  import ControlTab from "./lib/ControlTab.svelte";
  import Navbar from "./lib/Navbar.svelte";
  import _ from "lodash";
  import {
    easeInOutQuad,
    getCurvePoint,
    getMousePos,
    getRandomColor,
    quadraticToCubic,
    radiansToDegrees,
    shortestRotation,
  } from "./utils";
  import hotkeys from 'hotkeys-js';

  let two: Two;
  let twoElement: HTMLDivElement;

  let pointRadius = 1.15;
  let lineWidth = 0.57;
  let robotWidth = 17;
  let robotHeight = 17;
  let maxSpeed = 30; // Default max speed in inches per second
  let maxAccel = 20; // Default max acceleration in inches per second squared

  let percent: number = 0;

  // Update the robot image source to use the default robot image
  let robotImageSrc = "/robot.png";

  let startPoint: Point = {
    x: 8,
    y: 80,
    heading: "linear",
    startDeg: 0,
    endDeg: 0
  };

  /**
   * Converter for X axis from inches to pixels.
   */
  $: x = d3
    .scaleLinear()
    .domain([0, 144])
    .range([0, twoElement?.clientWidth ?? 144]);

  /**
   * Converter for Y axis from inches to pixels.
   */
  $: y = d3
    .scaleLinear()
    .domain([0, 144])
    .range([twoElement?.clientHeight ?? 144, 0]);

  // Initialize robot position
  let robotXY: BasePoint = { x: 0, y: 0 };
  let robotHeading: number = 0;

  // Update robot position based on start point
  $: if (two) {
    const newX = x(startPoint.x);
    const newY = y(startPoint.y);
    if (robotXY.x !== newX || robotXY.y !== newY) {
      robotXY = { x: newX, y: newY };
    }
  }

  // Force update when robot dimensions change
  $: {
    robotWidth;
    robotHeight;
    if (two) {
      two.update();
    }
  }

  // Add reactive statement for robot dimensions
  $: robotStyle = `
    position: absolute;
    top: ${robotXY.y}px;
    left: ${robotXY.x}px;
    transform: translate(-50%, -50%) rotate(${robotHeading}deg);
    z-index: 20;
    width: ${x(robotWidth)}px;
    height: ${x(robotHeight)}px;
    pointer-events: none;
  `;

  let lineGroup = new Two.Group();
  lineGroup.id = "line-group";
  let pointGroup = new Two.Group();
  pointGroup.id = "point-group";

  // Fixed color palette for pathchains
  const pathchainPalette = [
    'hsl(220, 80%, 45%)', // Blue
    'hsl(140, 70%, 40%)', // Green
    'hsl(270, 60%, 55%)', // Purple
    'hsl(30, 90%, 55%)',  // Orange
    'hsl(0, 80%, 55%)',   // Red
    'hsl(180, 70%, 45%)', // Teal
    'hsl(50, 90%, 55%)',  // Yellow
    'hsl(320, 70%, 55%)', // Pink
  ];

  let lines: Line[] = [
    {
      id: "line-1",
      endPoint: {
        x: 72,
        y: 72,
        heading: "linear",
        startDeg: 0,
        endDeg: 90,
      },
      controlPoints: [],
      color: pathchainPalette[0],
      group: 1,  // Default to group 1
      groupColor: pathchainPalette[0],
      groupName: "Group1",  // Default group name
      name: "Line 1"  // Default line name
    },
  ];

  $: points = (() => {
    let _points = [];
    let startPointElem = new Two.Circle(
      x(startPoint.x),
      y(startPoint.y),
      x(pointRadius)
    );
    startPointElem.id = `point-0-0`;
    startPointElem.fill = lines[0].color;
    startPointElem.noStroke();

    _points.push(startPointElem);

    lines.forEach((line, idx) => {
      [line.endPoint, ...line.controlPoints].forEach((point, idx1) => {
        if (idx1 > 0) {
          let pointGroup = new Two.Group();
          pointGroup.id = `point-${idx + 1}-${idx1}`;

          let pointElem = new Two.Circle(
            x(point.x),
            y(point.y),
            x(pointRadius)
          );
          pointElem.id = `point-${idx + 1}-${idx1}-background`;
          pointElem.fill = line.color;
          pointElem.noStroke();

          let pointText = new Two.Text(
            `${idx1}`,
            x(point.x),
            y(point.y - 0.15),
            x(pointRadius)
          );
          pointText.id = `point-${idx + 1}-${idx1}-text`;
          pointText.size = x(1.55);
          pointText.leading = 1;
          pointText.family = "ui-sans-serif, system-ui, sans-serif";
          pointText.alignment = "center";
          pointText.baseline = "middle";
          pointText.fill = "white";
          pointText.noStroke();

          pointGroup.add(pointElem, pointText);
          _points.push(pointGroup);
        } else {
          let pointElem = new Two.Circle(
            x(point.x),
            y(point.y),
            x(pointRadius)
          );
          pointElem.id = `point-${idx + 1}-${idx1}`;
          pointElem.fill = line.color;
          pointElem.noStroke();
          _points.push(pointElem);
        }
      });
    });

    return _points;
  })();

  $: path = (() => {
    let _path: (Path | PathLine)[] = [];

    lines.forEach((line, idx) => {
      let _startPoint = idx === 0 ? startPoint : lines[idx - 1].endPoint;

      let lineElem: Path | PathLine;
      if (line.controlPoints.length > 2) {
        // Approximate an n-degree bezier curve by sampling it at 100 points
        const samples = 100;
        const cps = [_startPoint, ...line.controlPoints, line.endPoint];
        let points = [new Two.Anchor(x(_startPoint.x), y(_startPoint.y), 0, 0, 0, 0, Two.Commands.move)];
        for (let i = 1; i <= samples; ++i) {
          const point = getCurvePoint(i / samples, cps);
          points.push(new Two.Anchor(x(point.x), y(point.y), 0, 0, 0, 0, Two.Commands.line));
        }
        points.forEach((point) => (point.relative = false));

        lineElem = new Two.Path(points);
        lineElem.automatic = false;
      } else if (line.controlPoints.length > 0) {
        let cp1 = line.controlPoints[1]
          ? line.controlPoints[0]
          : quadraticToCubic(_startPoint, line.controlPoints[0], line.endPoint)
              .Q1;
        let cp2 =
          line.controlPoints[1] ??
          quadraticToCubic(_startPoint, line.controlPoints[0], line.endPoint)
            .Q2;

        let points = [
          new Two.Anchor(
            x(_startPoint.x),
            y(_startPoint.y),
            x(_startPoint.x),
            y(_startPoint.y),
            x(cp1.x),
            y(cp1.y),
            Two.Commands.move
          ),
          new Two.Anchor(
            x(line.endPoint.x),
            y(line.endPoint.y),
            x(cp2.x),
            y(cp2.y),
            x(line.endPoint.x),
            y(line.endPoint.y),
            Two.Commands.curve
          ),
        ];
        points.forEach((point) => (point.relative = false));

        lineElem = new Two.Path(points);
        lineElem.automatic = false;
      } else {
        lineElem = new Two.Line(
          x(_startPoint.x),
          y(_startPoint.y),
          x(line.endPoint.x),
          y(line.endPoint.y)
        );
      }

      lineElem.id = `line-${idx + 1}`;
      lineElem.stroke = line.color;
      lineElem.linewidth = x(lineWidth);
      lineElem.noFill();
      lineElem.visible = true;
      lineElem.opacity = 1;

      _path.push(lineElem);
    });

    return _path;
  })();

  $: {
    let totalLineProgress = (lines.length * Math.min(percent, 99.999999999)) / 100;
    let currentLineIdx = Math.min(Math.trunc(totalLineProgress), lines.length - 1);
    let currentLine = lines[currentLineIdx];
    
    // Calculate progress within the current line
    let lineProgress = totalLineProgress - currentLineIdx;
    lineProgress = Math.max(0, Math.min(1, lineProgress));
    
    let _startPoint = currentLineIdx === 0 ? startPoint : lines[currentLineIdx - 1].endPoint;
    let robotInchesXY = getCurvePoint(lineProgress, [_startPoint, ...currentLine.controlPoints, currentLine.endPoint]);
    robotXY = { x: x(robotInchesXY.x), y: y(robotInchesXY.y) };

    switch (currentLine.endPoint.heading) {
      case "linear":
        robotHeading = -shortestRotation(
          currentLine.endPoint.startDeg,
          currentLine.endPoint.endDeg,
          lineProgress
        );
        break;
      case "constant":
        robotHeading = -currentLine.endPoint.degrees;
        break;
      case "tangential":
        const nextPointInches = getCurvePoint(
          lineProgress + (currentLine.endPoint.reverse ? -0.01 : 0.01),
          [_startPoint, ...currentLine.controlPoints, currentLine.endPoint]
        );
        const nextPoint = { x: x(nextPointInches.x), y: y(nextPointInches.y) };

        const dx = nextPoint.x - robotXY.x;
        const dy = nextPoint.y - robotXY.y;

        if (dx !== 0 || dy !== 0) {
          const angle = Math.atan2(dy, dx);
          robotHeading = radiansToDegrees(angle);
        }
        break;
    }
  }

  $: if (two) {
    //console.log('Updating canvas with paths:', path.length);
    two.clear();
    path.forEach(p => {
      //console.log('Adding path:', p.id, 'visible:', p.visible, 'opacity:', p.opacity);
      two.add(p);
    });
    points.forEach(p => {
      console.log('Adding point:'); //, p.id, 'visible:', p.visible);
      two.add(p);
    });
    two.update();
  }

  let playing = false;
  let isPaused = false;
  let animationFrame: number;
  let startTime: number | null = null;
  let previousTime: number | null = null;

  function animate(timestamp: number) {
    if (!startTime) {
      startTime = timestamp;
      previousTime = timestamp;
      requestAnimationFrame(animate);
      return;
    }

    const deltaTime = timestamp - previousTime!;
    previousTime = timestamp;

    if (playing && !isPaused) {
      // Calculate current line length in inches
      let currentLineIdx = Math.trunc((lines.length * percent) / 100);
      let currentLine = lines[currentLineIdx];
      let _startPoint = currentLineIdx === 0 ? startPoint : lines[currentLineIdx - 1].endPoint;
      
      // Calculate current line length
      const dx = currentLine.endPoint.x - _startPoint.x;
      const dy = currentLine.endPoint.y - _startPoint.y;
      const currentLineLength = Math.sqrt(dx * dx + dy * dy);

      // Calculate distance to travel this frame in inches
      const distanceThisFrame = (maxSpeed * deltaTime) / 1000; // Convert to inches per frame
      
      // Calculate progress within current line
      let lineProgress = (lines.length * percent) / 100 - currentLineIdx;
      lineProgress = Math.max(0, Math.min(1, lineProgress));
      
      // Calculate current distance along the line
      const currentDistance = lineProgress * currentLineLength;
      
      // Calculate new distance
      const newDistance = currentDistance + distanceThisFrame;
      
      // Convert back to percentage of the line
      const newLineProgress = newDistance / currentLineLength;
      
      // Convert back to total percentage
      const newPercent = ((currentLineIdx + newLineProgress) / lines.length) * 100;

      // Check if we're at the end of a group
      let currentGroup = currentLine.group;
      let nextLineIdx = currentLineIdx + 1;
      let isEndOfGroup = nextLineIdx >= lines.length || lines[nextLineIdx].group !== currentGroup;

      if (isEndOfGroup && newLineProgress >= 1) {
        isPaused = true;
        percent = ((currentLineIdx + 1) / lines.length) * 100; // Set to exact end of current line
        setTimeout(() => {
          isPaused = false;
          if (playing) {
            percent = Math.min(100, newPercent);
            if (percent >= 100) {
              percent = 0;
            }
          }
        }, 500);
      } else {
        percent = newPercent;
        if (percent >= 100) {
          percent = 0;
        }
      }
    }

    if (playing) {
      requestAnimationFrame(animate);
    }
  }

  function play() {
    if (!playing) {
      playing = true;
      isPaused = false;
      startTime = null;
      previousTime = null;
      percent = 0; // Always start from beginning
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function pause() {
    playing = false;
    isPaused = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  // Add a function to handle manual slider changes
  function handleSliderChange() {
    if (playing) {
      pause();
    }
  }

  onMount(() => {
    console.log('Mounting component...');
    console.log('Initial startPoint:', startPoint);
    console.log('Initial lines:', lines);
    console.log('Canvas dimensions:', twoElement.clientWidth, twoElement.clientHeight);

    const container = document.getElementById('two-container');
    if (!container) {
      console.error('Could not find two-container element');
      return;
    }

    // Initialize Two.js with explicit dimensions
    two = new Two({
      width: twoElement.clientWidth,
      height: twoElement.clientHeight,
      type: Two.Types.svg,
      autostart: true
    }).appendTo(container);

    // Set up the SVG renderer
    const svgElement = two.renderer.domElement;
    svgElement.style.position = 'absolute';
    svgElement.style.top = '0';
    svgElement.style.left = '0';
    svgElement.style.width = '100%';
    svgElement.style.height = '100%';
    svgElement.style.pointerEvents = 'auto';
    svgElement.style.zIndex = '20';

    console.log('Two.js initialized:', two);
    console.log('SVG element:', svgElement);

    // Set initial robot position
    robotXY = { x: x(startPoint.x), y: y(startPoint.y) };
    robotHeading = 0;

    console.log('Initial robot position:', robotXY);

    // Create initial line
    const initialLine = new Two.Line(
      x(startPoint.x),
      y(startPoint.y),
      x(lines[0].endPoint.x),
      y(lines[0].endPoint.y)
    );
    initialLine.stroke = lines[0].color;
    initialLine.linewidth = x(lineWidth);
    initialLine.noFill();
    initialLine.id = 'initial-line';
    initialLine.visible = true;

    console.log('Initial line created:', initialLine);

    // Create initial points
    const startPointCircle = new Two.Circle(
      x(startPoint.x),
      y(startPoint.y),
      x(pointRadius)
    );
    startPointCircle.fill = lines[0].color;
    startPointCircle.noStroke();
    startPointCircle.id = 'start-point';
    startPointCircle.visible = true;

    const endPointCircle = new Two.Circle(
      x(lines[0].endPoint.x),
      y(lines[0].endPoint.y),
      x(pointRadius)
    );
    endPointCircle.fill = lines[0].color;
    endPointCircle.noStroke();
    endPointCircle.id = 'end-point';
    endPointCircle.visible = true;

    console.log('Points created:', startPointCircle, endPointCircle);

    // Add elements to canvas
    two.add(initialLine);
    two.add(startPointCircle);
    two.add(endPointCircle);

    // Force an update to ensure everything is rendered
    two.update();

    console.log('Elements added to canvas');
    console.log('Canvas elements:', two.scene.children);

    updateRobotImage();

    let currentElem: string | null = null;
    let isDown = false;

    function handleMouseDown(evt: MouseEvent) {
      evt.preventDefault(); // Prevent default to ensure our handler runs
      isDown = true;
      const elem = document.elementFromPoint(evt.clientX, evt.clientY);
      if (elem?.id.startsWith("point")) {
        currentElem = elem.id;
      } else {
        // Do nothing on field click (no point addition)
      }
    }

    function handleMouseMove(evt: MouseEvent) {
      evt.preventDefault(); // Prevent default to ensure our handler runs
      const elem = document.elementFromPoint(evt.clientX, evt.clientY);
      if (isDown && currentElem) {
        const line = Number(currentElem.split("-")[1]) - 1;
        const point = Number(currentElem.split("-")[2]);

        const { x: xPos, y: yPos } = getMousePos(evt, twoElement);

        if (line === -1) {
          startPoint.x = x.invert(xPos);
          startPoint.y = y.invert(yPos);
        } else {
          if (point === 0) {
            lines[line].endPoint.x = x.invert(xPos);
            lines[line].endPoint.y = y.invert(yPos);
          } else {
            lines[line].controlPoints[point - 1].x = x.invert(xPos);
            lines[line].controlPoints[point - 1].y = y.invert(yPos);
          }
          lines = [...lines]; // Trigger reactivity
        }
      } else {
        if (elem?.id.startsWith("point")) {
          twoElement.style.cursor = "pointer";
          currentElem = elem.id;
        } else {
          twoElement.style.cursor = "auto";
          currentElem = null;
        }
      }
    }

    function handleMouseUp(evt: MouseEvent) {
      evt.preventDefault(); // Prevent default to ensure our handler runs
      isDown = false;
      currentElem = null;
    }

    // Add event listeners with capture phase to ensure they run first
    twoElement.addEventListener("mousedown", handleMouseDown, true);
    twoElement.addEventListener("mousemove", handleMouseMove, true);
    twoElement.addEventListener("mouseup", handleMouseUp, true);

    // Initial render
    function render() {
      two.clear();
      two.add(...path);
      two.add(...points);
      two.update();
    }

    // Initial render
    render();

    return () => {
      twoElement.removeEventListener("mousedown", handleMouseDown, true);
      twoElement.removeEventListener("mousemove", handleMouseMove, true);
      twoElement.removeEventListener("mouseup", handleMouseUp, true);
    };
  });

  // Add resize handler
  window.addEventListener('resize', () => {
    if (two && twoElement) {
      two.width = twoElement.clientWidth;
      two.height = twoElement.clientHeight;
      
      // Force update of robot position
      robotXY = { x: x(startPoint.x), y: y(startPoint.y) };
      
      // Force re-render of paths and points
      two.clear();
      two.add(...path);
      two.add(...points);
      two.update();
    }
  });

  // Force an initial render after a short delay
  setTimeout(() => {
    if (two && twoElement) {
      two.width = twoElement.clientWidth;
      two.height = twoElement.clientHeight;
      
      // Force update of robot position
      robotXY = { x: x(startPoint.x), y: y(startPoint.y) };
      
      // Force re-render of paths and points
      two.clear();
      two.add(...path);
      two.add(...points);
      two.update();
    }
  }, 500);

  document.addEventListener("keydown", function (evt) {
    if (evt.code === "Space" && document.activeElement === document.body) {
      if (playing) {
        pause();
      } else {
        play();
      }
    }
  });

  function saveFile() {
    const jsonString = JSON.stringify({ startPoint, lines });

    const blob = new Blob([jsonString], { type: "application/json" });

    const linkObj = document.createElement("a");

    const url = URL.createObjectURL(blob);

    linkObj.href = url;
    linkObj.download = "trajectory.pp";

    document.body.appendChild(linkObj);

    linkObj.click();

    document.body.removeChild(linkObj);

    URL.revokeObjectURL(url);
  }

  function getColorVariation(baseColor: string, index: number, totalInGroup: number) {
    // Parse the HSL color
    const match = baseColor.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!match) return baseColor.startsWith('hsl') ? baseColor : 'hsl(220, 80%, 45%)'; // fallback to blue if not HSL
    const [_, hue, saturation, lightness] = match;
    // Make each subsequent line lighter by increasing lightness
    const newLightness = Math.min(90, parseInt(lightness) + (index * (40 / totalInGroup)));
    return `hsl(${hue}, ${saturation}%, ${newLightness}%)`;
  }

  function updateLineColors() {
    console.log('[updateLineColors] lines array length:', lines.length, 'lines:', lines.map(l => ({id: l.id, group: l.group, color: l.color})));
    // Map of group number to palette index
    let groupNumbers = Array.from(new Set(lines.map(line => line.group)));
    groupNumbers.sort((a, b) => a - b);
    let groupToPaletteIndex = new Map<number, number>();
    groupNumbers.forEach((group, idx) => {
      groupToPaletteIndex.set(group, idx % pathchainPalette.length);
    });

    // For each group, assign groupColor and color variations
    groupNumbers.forEach(group => {
      const groupLines = lines.filter(line => line.group === group);
      const groupColor = pathchainPalette[groupToPaletteIndex.get(group)!];
      groupLines.forEach((line, idx) => {
        line.groupColor = groupColor;
        line.color = getColorVariation(groupColor, idx, groupLines.length);
        console.log(`[updateLineColors] group: ${group}, idx: ${idx}, id: ${line.id}, color: ${line.color}`);
      });
    });
  }

  function loadFile(evt: Event) {
    const elem = evt.target as HTMLInputElement;
    const file = elem.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = function (e: ProgressEvent<FileReader>) {
        try {
          const result = e.target?.result as string;

          const jsonObj: {
            startPoint: Point;
            lines: Line[];
          } = JSON.parse(result);

          // Add IDs to loaded lines
          jsonObj.lines = jsonObj.lines.map((line, index) => ({
            ...line,
            id: `line-${index + 1}`
          }));

          startPoint = jsonObj.startPoint;
          lines = jsonObj.lines;
          updateLineColors(); // Ensure colors are recalculated after loading
          console.log('[loadFile] Lines after loading and color update:', lines.map(l => ({id: l.id, group: l.group, color: l.color})));
        } catch (err) {
          console.error(err);
        }
      };

      reader.readAsText(file);
    }
  }

  function loadRobot(evt: Event) {
    const elem = evt.target as HTMLInputElement;
    const file = elem.files?.[0];

    if (file && file.type === "image/png") {
      const reader = new FileReader();

      reader.onload = function (e: ProgressEvent<FileReader>) {
        const result = e.target?.result as string;
        localStorage.setItem('robot.png', result);
        updateRobotImage();
      };

      reader.readAsDataURL(file);
    } else {
      console.error("Invalid file type. Please upload a PNG file.");
    }
  }

  function updateRobotImage() {
    const storedImage = localStorage.getItem('robot.png');
    if (storedImage) {
      robotImageSrc = storedImage;
    }
  }

  function addNewLine() {
    // Get the current group number
    const currentGroup = lines.length > 0 ? lines[lines.length - 1].group : 1;
    // Count how many lines are in the current group
    const linesInGroup = lines.filter(line => line.group === currentGroup).length;
    // If this is the first line in a group, pick the next color from the palette
    let groupColor;
    if (linesInGroup === 0) {
      const groupIndex = (currentGroup - 1) % pathchainPalette.length;
      groupColor = pathchainPalette[groupIndex];
    } else {
      const groupFirstLine = lines.find(line => line.group === currentGroup);
      groupColor = groupFirstLine!.groupColor;
    }
    // Use a variation for each line in the group
    let color = getColorVariation(groupColor, linesInGroup, 5); // 5 is a reasonable default
    lines = [
      ...lines,
      {
        id: `line-${lines.length + 1}`,
        endPoint: {
          x: _.random(36, 108),
          y: _.random(36, 108),
          heading: "tangential",
          reverse: false,
        },
        controlPoints: [],
        color: color,
        group: currentGroup,
        groupColor: groupColor,
        groupName: `Group${currentGroup}`,
        name: `Line ${lines.length + 1}`
      },
    ];
    console.log('[addNewLine] lines array after push:', lines.map(l => ({id: l.id, group: l.group, color: l.color})));
    updateLineColors();
  }

  function addControlPoint() {
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      lastLine.controlPoints.push({
        x: _.random(36, 108),
        y: _.random(36, 108),
      });
      }
      console.log('Add Control Point');
  }

  function removeControlPoint() {
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1]; 
      if (lastLine.controlPoints.length > 0) {
        lastLine.controlPoints.pop();
      }
    }
  }

  hotkeys('w', function(event, handler){
    event.preventDefault();
    addNewLine();
  });

  hotkeys('a', function(event, handler){
    event.preventDefault();
    addControlPoint();
    two.update();
  });

  hotkeys('s', function(event, handler){
    event.preventDefault();
    removeControlPoint();
    two.update();
  });

  // Call updateLineColors whenever lines change
  $: updateLineColors();
</script>

<Navbar bind:lines bind:startPoint {saveFile} {loadFile} {loadRobot}/>
<div
  class="w-screen h-screen pt-20 p-2 flex flex-row justify-center items-center gap-2"
>
  <div class="flex h-full justify-center items-center">
    <div
      bind:this={twoElement}
      class="h-full aspect-square rounded-lg shadow-md bg-neutral-50 dark:bg-neutral-900 relative overflow-clip"
      style="position: relative;"
    >
      <img
        src="/fields/intothedeep.webp"
        alt="Field"
        class="absolute top-0 left-0 w-full h-full rounded-lg z-10 pointer-events-none"
      />
      <div id="two-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 20;"></div>
      <img
        src={robotImageSrc}
        alt="Robot"
        style={robotStyle}
      />
    </div>
  </div>
  <ControlTab
    bind:playing
    {play}
    {pause}
    bind:startPoint
    bind:lines
    bind:robotWidth
    bind:robotHeight
    bind:percent
    on:input={handleSliderChange}
    bind:robotXY
    bind:robotHeading
    bind:maxSpeed
    bind:maxAccel
    {x}
    {y}
    {addNewLine}
  />
</div>
