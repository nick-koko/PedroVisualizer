<script lang="ts">
  import _ from "lodash";
  import { getRandomColor } from "../utils";
  import { dndzone } from 'svelte-dnd-action';

  export let percent: number;
  export let playing: boolean;
  export let play: () => any;
  export let pause: () => any;
  export let startPoint: Point;
  export let lines: Line[];
  export let robotWidth: number;
  export let robotHeight: number;
  export let robotXY: BasePoint;
  export let robotHeading: number;
  export let x: d3.ScaleLinear<number, number, number>;
  export let y: d3.ScaleLinear<number, number, number>;
  export let maxSpeed: number;
  export let maxAccel: number;
  export let addNewLine: () => void;
  export let updateLineColors: () => void;

  // Use the same palette as App.svelte
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

  // Add Line After function
  function addLineAfter(idx: number) {
    const line = lines[idx];
    const newLine = {
      id: `line-${lines.length + 1}`,
      endPoint: {
        x: _.random(0, 144),
        y: _.random(0, 144),
        heading: 'tangential' as 'tangential',
        reverse: false,
      },
      controlPoints: [],
      color: line.color,
      group: line.group,
      groupColor: line.groupColor,
      groupName: line.groupName,
      name: `Line ${lines.length + 1}`
    };
    lines.splice(idx + 1, 0, newLine);
    lines = [...lines];
  }
</script>

<div class="flex-1 flex flex-col justify-start items-center gap-2 h-full">
  <div
    class="flex flex-col justify-start items-start w-full rounded-lg bg-neutral-50 dark:bg-neutral-900 shadow-md p-4 overflow-y-scroll overflow-x-hidden h-full gap-6"
  >
    <div class="flex flex-col w-full justify-start items-start gap-0.5 text-sm">
      <div class="font-semibold">Canvas Options</div>
      <div class="flex flex-row justify-start items-center gap-2">
        <div class="font-extralight">Robot Width:</div>
        <input
          bind:value={robotWidth}
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-16"
          step="1"
          min="1"
          max="144"
          on:input={() => robotWidth = Number(robotWidth)}
        />
        <div class="font-extralight">Robot Height:</div>
        <input
          bind:value={robotHeight}
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 border-[0.5px] focus:outline-none w-16 dark:bg-neutral-950 dark:border-neutral-700"
          step="1"
          min="1"
          max="144"
          on:input={() => robotHeight = Number(robotHeight)}
        />
      </div>
      <div class="flex flex-row justify-start items-center gap-2 mt-2">
        <div class="font-extralight">Max Speed (in/s):</div>
        <input
          bind:value={maxSpeed}
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-20"
          step="0.1"
          min="0.1"
          max="100"
          on:input={() => maxSpeed = Number(maxSpeed)}
        />
        <div class="font-extralight">Max Accel (in/s²):</div>
        <input
          bind:value={maxAccel}
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-20"
          step="0.1"
          min="0.1"
          max="100"
          on:input={() => maxAccel = Number(maxAccel)}
        />
      </div>
    </div>

    <div class="flex flex-col w-full justify-start items-start gap-0.5 text-sm">
      <div class="font-semibold">Current Robot Position</div>
      <div class="flex flex-row justify-start items-center gap-2">
        <div class="font-extralight">X:</div>
        <div class="w-16">{x.invert(robotXY.x).toFixed(3)}</div>
        <div class="font-extralight">Y:</div>
        <div class="w-16">{y.invert(robotXY.y).toFixed(3)}</div>
        <div class="font-extralight">Heading:</div>
        <div>
          {robotHeading.toFixed(0) === "-0"
            ? "0"
            : -robotHeading.toFixed(0)}&deg;
        </div>
      </div>
    </div>

    <div class="flex flex-col w-full justify-start items-start gap-0.5">
      <div class="font-semibold">Start Point</div>
      <div class="flex flex-row justify-start items-center gap-2">
        <div class="font-extralight">X:</div>
        <input
          bind:value={startPoint.x}
          min="0"
          max="144"
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 border-[0.5px] focus:outline-none w-28 dark:bg-neutral-950 dark:border-neutral-700"
          step="0.1"
        />
        <div class="font-extralight">Y:</div>
        <input
          bind:value={startPoint.y}
          min="0"
          max="144"
          type="number"
          class="pl-1.5 rounded-md bg-neutral-100 border-[0.5px] focus:outline-none w-28 dark:bg-neutral-950 dark:border-neutral-700"
          step="0.1"
        />
      </div>
    </div>

    <div class="flex flex-col w-full justify-start items-start gap-0.5" 
         use:dndzone={{ 
           items: lines,
           flipDurationMs: 300,
           dragDisabled: false,
           morphDisabled: false,
           dropFromOthersDisabled: false
         }}>
      {#each lines as line, idx (line.id)}
        {@const isNewGroup = idx === 0 || lines[idx - 1].group !== line.group}
        {@const currentGroup = lines.slice(0, idx + 1).filter((l, i) => i === 0 || lines[i - 1].group !== l.group).length - 1}
        <div class="flex flex-col w-full justify-start items-start gap-1" 
             data-dnd-item
             class:mt-6={idx > 0 && isNewGroup}>
          <div class="flex flex-row w-full justify-between">
            <div class="flex flex-row items-center gap-2">
              {#if isNewGroup}
                <div class="w-1 h-8 rounded-full"
                     style="background: {pathchainPalette[currentGroup % pathchainPalette.length]};">
                </div>
              {:else}
                <div class="w-1"></div>
              {/if}
              <div class="font-semibold flex flex-row justify-start items-center gap-2">
                <input
                  type="text"
                  bind:value={line.name}
                  class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-32"
                  placeholder={`Line ${idx + 1}`}
                />
                <div
                  class="size-2.5 rounded-full shadow-md"
                  style={`background: ${line.color}`}
                />
                <div class="flex flex-row items-center gap-1">
                  <label class="text-sm font-light flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={idx === 0 || lines[idx - 1].group !== line.group}
                      on:change={(e) => {
                        const target = e.target;
                        if (target instanceof HTMLInputElement && target.checked) {
                          line.group = lines[idx - 1]?.group + 1 || 1;
                          line.groupName = `Group${line.group}`;
                        } else {
                          line.group = lines[idx - 1]?.group || 1;
                          line.groupName = `Group${line.group}`;
                        }
                        updateLineColors();
                      }}
                      class="cursor-pointer"
                    />
                    New Pathchain
                  </label>
                  {#if idx === 0 || lines[idx - 1].group !== line.group}
                    <input
                      type="text"
                      bind:value={line.groupName}
                      class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-24"
                      placeholder={`Group${line.group}`}
                    />
                  {/if}
                </div>
              </div>
            </div>
            <div class="flex flex-row justify-end items-center gap-1">
              <button
                title="Remove Line"
                on:click={() => {
                  lines.splice(idx, 1);
                  lines = [...lines];
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width={2}
                  class="size-5 stroke-red-500"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </button>
              <button
                title="Add Line After"
                on:click={() => addLineAfter(idx)}
                class="ml-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width={2}
                  class="size-5 stroke-blue-500"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class={`h-[0.75px] w-full`} style={`background: ${line.color}`} />
          <div class="flex flex-row justify-end items-center gap-1 mt-1">
            <button
              title="Add Control Point"
              on:click={() => {
                line.controlPoints = [
                  ...line.controlPoints,
                  {
                    x: _.random(36, 108),
                    y: _.random(36, 108),
                  },
                ];
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width={2}
                class="size-5 stroke-green-500"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>
          <div class="flex flex-col justify-start items-start ml-8">
            <div class="font-light">End Point:</div>
            <div class="flex flex-row justify-start items-center gap-2">
              <div class="font-extralight">X:</div>
              <input
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
                step="0.1"
                type="number"
                min="0"
                max="144"
                bind:value={line.endPoint.x}
              />
              <div class="font-extralight">Y:</div>
              <input
                class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
                step="0.1"
                min="0"
                max="144"
                type="number"
                bind:value={line.endPoint.y}
              />

              <select
                bind:value={line.endPoint.heading}
                class=" rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28 text-sm"
              >
                <option value="constant">Constant</option>
                <option value="linear">Linear</option>
                <option value="tangential">Tangential</option>
              </select>

              {#if line.endPoint.heading === "linear"}
                <input
                  class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
                  step="1"
                  type="number"
                  min="-180"
                  max="180"
                  bind:value={line.endPoint.startDeg}
                />
                <input
                  class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
                  step="1"
                  type="number"
                  min="-180"
                  max="180"
                  bind:value={line.endPoint.endDeg}
                />
              {:else if line.endPoint.heading === "constant"}
                <input
                  class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-14"
                  step="1"
                  type="number"
                  min="-180"
                  max="180"
                  bind:value={line.endPoint.degrees}
                />
              {:else if line.endPoint.heading === "tangential"}
                <p class="text-sm font-extralight">Reverse:</p>
                <input type="checkbox" bind:checked={line.endPoint.reverse} />
              {/if}
            </div>
          </div>
          {#each line.controlPoints as point, idx1}
            <div class="flex flex-col justify-start items-start ml-8">
              <div class="font-light">Control Point {idx1 + 1}:</div>
              <div class="flex flex-row justify-start items-center gap-2">
                <div class="font-extralight">X:</div>
                <input
                  class="pl-1.5 rounded-md bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
                  step="0.1"
                  type="number"
                  bind:value={point.x}
                  min="0"
                  max="144"
                />
                <div class="font-extralight">Y:</div>
                <input
                  class="pl-1.5 round
                  d bg-neutral-100 dark:bg-neutral-950 dark:border-neutral-700 border-[0.5px] focus:outline-none w-28"
                  step="0.1"
                  type="number"
                  bind:value={point.y}
                  min="0"
                  max="144"
                />
                <button
                  title="Remove Control Point"
                  on:click={() => {
                    let _pts = line.controlPoints;
                    _pts.splice(idx1, 1);
                    line.controlPoints = _pts;
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width={2}
                    class="size-5 stroke-red-500"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
    <button
      on:click={addNewLine}
      class="font-semibold text-green-500 text-sm flex flex-row justify-start items-center gap-1"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width={2}
        stroke="currentColor"
        class="size-5"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
      <p>Add Line</p>
    </button>
  </div>
  <div
    class="w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 flex flex-row justify-start items-center gap-3 shadow-lg"
  >
    <button
      title="Play/Pause"
      on:click={() => {
        if (playing) {
          pause();
        } else {
          play();
        }
      }}
    >
      {#if !playing}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="size-6 stroke-green-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
          />
        </svg>
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="2"
          stroke="currentColor"
          class="size-6 stroke-green-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 5.25v13.5m-7.5-13.5v13.5"
          />
        </svg>
      {/if}
    </button>
    <input
      bind:value={percent}
      type="range"
      min="0"
      max="100"
      step="0.000001"
      class="w-full appearance-none slider focus:outline-none"
    />
  </div>
</div>
