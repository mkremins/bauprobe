/// Utils

function mapcat(xs, f) {
  const ys = [];
  for (const x of xs) {
    for (const y of f(x) || []) {
      ys.push(y);
    }
  }
  return ys;
}

function distinctBy(f, xs) {
  const seen = new Set();
  const ys = [];
  for (const x of xs) {
    const signature = f(x);
    if (seen.has(signature)) continue;
    seen.add(signature);
    ys.push(x);
  }
  return ys;
}

/// Model

function unpackPoint(pointStr) {
  return pointStr.split(",").map(n => parseInt(n));
}

function canPlaceWall(pegKeyA, pegKeyB) {
  if (!pegKeyA || !pegKeyB) return false;
  const [x1, y1] = unpackPoint(pegKeyA);
  const [x2, y2] = unpackPoint(pegKeyB);
  if (x1 === x2 && y1 !== y2) return true;
  if (y1 === y2 && x1 !== x2) return true;
  const xDiff = Math.abs(x2 - x1);
  const yDiff = Math.abs(y2 - y1);
  if (xDiff > 0 && yDiff > 0 && xDiff === yDiff) return true;
  return false;
}

function findIntersection(lineA, lineB) {
  // adapted from https://gist.github.com/leocb/248a635ff73bae91939aaf728ae2152c
  const [[x1, y1], [x2, y2]] = lineA.map(unpackPoint);
  const [[x3, y3], [x4, y4]] = lineB.map(unpackPoint);
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) {
    // lines parallel or colinear
    return null;
  }
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    // intersection on extended lines but outside actual line segments
    return null;
  }
  // return actual intersection
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);
  return [x, y];
}

function isPointOnLine(point, line) {
  const EPSILON = 0.0001;
  const [px, py] = unpackPoint(point);
  const [[x1, y1], [x2, y2]] = line.map(unpackPoint);
  const crossProduct = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
  if (Math.abs(crossProduct) > EPSILON) {
    // Point is not aligned with the line
    return false;
  }
  const xMin = Math.min(x1, x2) - EPSILON;
  const xMax = Math.max(x1, x2) + EPSILON;
  const yMin = Math.min(y1, y2) - EPSILON;
  const yMax = Math.max(y1, y2) + EPSILON;
  return px >= xMin && px <= xMax && py >= yMin && py <= yMax;
}

function findCollisions(oldWall, newWall) {
  const [oldP1, oldP2] = oldWall;
  const [newP1, newP2] = newWall;
  // First, check if new wall endpoint(s) lie along old wall,
  // and/or old wall endpoint(s) lie along new wall.
  const oldP1InsideNew = isPointOnLine(oldP1, newWall);
  const oldP2InsideNew = isPointOnLine(oldP2, newWall);
  const newP1InsideOld = isPointOnLine(newP1, oldWall);
  const newP2InsideOld = isPointOnLine(newP2, oldWall);
  if (newP1InsideOld && newP2InsideOld) {
    // New is fully within old, no need to change anything.
    return [{type: "oldSubsumesNew", old: oldWall}];
  }
  else if (oldP1InsideNew && oldP2InsideNew) {
    // Old is fully inside new, it should be superseded?
    return [{type: "newSubsumesOld", old: oldWall}];
  }
  else if (newP1InsideOld || newP2InsideOld || oldP1InsideNew || oldP2InsideNew) {
    const sharedEndpoint = oldWall.find(p => newWall.includes(p)) || newWall.find(p => oldWall.includes(p));
    if (sharedEndpoint) {
      // One endpoint is shared by both, can safely move on.
      // TODO Might want to merge them if there's no other splits to make?
      return [{type: "sharedEndpoint", old: oldWall, at: sharedEndpoint}];
    }
    else {
      // Both might split one another, check what splits actually occur.
      // TODO If both split one another, they're colinear and maybe mergeable
      // as long as there's no other splits to make?
      const newSplitsOld = (newP1InsideOld && newP1) || (newP2InsideOld && newP2);
      const oldSplitsNew = (oldP1InsideNew && oldP1) || (oldP2InsideNew && oldP2);
      return [
        newSplitsOld && {type: "newSplitsOld", old: oldWall, at: newSplitsOld},
        oldSplitsNew && {type: "oldSplitsNew", old: oldWall, at: oldSplitsNew},
      ].filter(x => x);
    }
  }
  else {
    // Three possibilities:
    // - The walls properly *cross* (i.e., both split each other)
    // - The walls are parallel (i.e., no interaction)
    // - The walls are colinear but not touching (i.e., no interaction)
    const intersection = findIntersection(oldWall, newWall);
    if (intersection) {
      return [{type: "properCross", old: oldWall, at: `${intersection[0]},${intersection[1]}`}];
    }
    else {
      return [];
    }
  }
}

function calculateLength(wall) {
  const [[x1, y1], [x2, y2]] = wall.map(unpackPoint);
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function splitWall(wall, splitPoints) {
  if (splitPoints.length === 0) return [wall];
  console.log("original wall length", calculateLength(wall));
  const allPoints = wall.concat(splitPoints);
  allPoints.sort((a, b) => {
    const [ax, ay] = unpackPoint(a);
    const [bx, by] = unpackPoint(b);
    return (ax - bx) || (ay - by);
  }); // sort by grid order i guess?
  console.log("all points", allPoints);
  const splitSections = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const section = [allPoints[i], allPoints[i+1]];
    console.log("section length", calculateLength(section));
    splitSections.push(section);
  }
  return splitSections;
}

function addWall(oldWalls, newWall) {
  const collisions = mapcat(oldWalls, oldWall => findCollisions(oldWall, newWall));
  console.log("COLLISIONS", collisions);
  if (collisions.length === 0) {
    // No collisions, push the new wall and call it a day!
    oldWalls.push(newWall);
    return oldWalls;
  }
  else if (collisions.some(coll => coll.type === "oldSubsumesNew")) {
    // New wall falls fully inside (some) old wall, don't place new at all
    return oldWalls;
  }
  else {
    // There's at least one split point, gotta execute splits
    const splitsPerOldWall = {};
    const newWallSplits = new Set();
    for (const coll of collisions) {
      const splitNew = coll.type === "properCross" || coll.type === "oldSplitsNew";
      const splitOld = coll.type === "properCross" || coll.type === "newSplitsOld";
      if (splitNew) {
        newWallSplits.add(coll.at);
      }
      if (splitOld) {
        const oldWallKey = JSON.stringify(coll.old);
        splitsPerOldWall[oldWallKey] = splitsPerOldWall[oldWallKey] || new Set();
        splitsPerOldWall[oldWallKey].add(coll.at);
      }
      if (coll.type === "newSubsumesOld") {
        newWallSplits.add(coll.old[0]);
        newWallSplits.add(coll.old[1]);
        // TODO somehow actually kill the subsumed old wall?
      }
    }
    console.log("SPLITS", newWallSplits, splitsPerOldWall);
    const newWallSections = splitWall(newWall, Array.from(newWallSplits));
    const updatedOldWalls = mapcat(oldWalls, oldWall => {
      const oldWallKey = JSON.stringify(oldWall);
      const oldWallSplits = splitsPerOldWall[oldWallKey] || [];
      return splitWall(oldWall, Array.from(oldWallSplits));
    });
    // TODO there is a minor bug where we can sometimes add zero-length sections,
    // not sure where best to filter
    return distinctBy(
      section => { const sig = clone(section); sig.sort(); return sig.join(";"); },
      updatedOldWalls.concat(newWallSections),
    );
  }
}

function pointInsidePolygon(point, polygon) {
  const [px, py] = unpackPoint(point);
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ix, iy] = unpackPoint(polygon[i]);
    const [jx, jy] = unpackPoint(polygon[j]);
    const didIntersect = ((iy > py) !== (jy > py)) && (px < (jx - ix) * (py - iy) / (jy - iy) + ix);
    if (didIntersect) isInside = !isInside;
  }
  return isInside;
}

function boundingBox(polygon) {
  const points = polygon.map(unpackPoint);
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {minX, maxX, minY, maxY};
  //return [[minX, minY], [minX, maxY], [maxX, minY], [maxX, maxY]];
}

function pathingPointsInside(polygon) {
  const EPSILON = 0.0001;
  const bb = boundingBox(polygon);
  const pointsInside = [];
  for (let x = bb.minX + (CELL_SIZE / 2); x < bb.maxX; x += CELL_SIZE) {
    for (let y = bb.minY + (CELL_SIZE / 2); y < bb.maxY; y += CELL_SIZE) {
      // check variants of each point to make sure it isn't super close to a wall lol
      // FIXME this is the worst way to do this probably???
      const testPoints = [
        `${x - EPSILON},${y - EPSILON}`,
        `${x - EPSILON},${y + EPSILON}`,
        `${x + EPSILON},${y - EPSILON}`,
        `${x + EPSILON},${y + EPSILON}`
      ];
      if (testPoints.every(p => pointInsidePolygon(p, polygon))) {
        pointsInside.push([x, y]);
      }
    }
  }
  return pointsInside;
}

function roomContains(bigger, smaller) {
  // i suspect we can cheat on general polygon contains by checking,
  // for each vertex of *this* polygon:
  // - is this vertex also a vertex of some other polygon?
  // - is this vertex *inside* some other polygon?
  // ...and a room is a polygon with no contained polygons inside
  return smaller.every(vertex => {
    if (bigger.includes(vertex)) return true;
    if (pointInsidePolygon(vertex, bigger)) return true;
    return false;
  });
}

function findRooms(walls) {
  if (walls.length === 0) return [];
  const allPointsEver = new Set(mapcat(walls, wall => wall));
  const allPointsSeen = new Set();
  const loopsByComponent = [];
  while (allPointsSeen.size < allPointsEver.size) {
    // Extract all loops from a SINGLE GRAPH COMPONENT, keeping in mind that
    // there might be multiple components lying around and that we'll need to
    // repeat this logic if any vertices aren't covered by the traversals
    // conducted here.
    const pointsNotSeenYet = allPointsEver.difference(allPointsSeen);
    console.log("UNSEEN POINTS", pointsNotSeenYet);
    const start = pointsNotSeenYet.values().next().value; // arbitrary unseen point
    allPointsSeen.add(start);
    const completeLoops = []; // all loops observed in this component
    let activeTraversals = [[start]];
    while (activeTraversals.length > 0) {
      activeTraversals = mapcat(activeTraversals, path => {
        const prev = path.at(-2);
        const here = path.at(-1);
        const nexts = walls.filter(
          wall => wall.includes(here) && !wall.includes(prev)
        ).map(
          wall => wall.find(p => p !== here)
        );
        const activeBranches = [];
        for (const next of nexts) {
          allPointsSeen.add(next);
          const hasLooped = path.includes(next);
          if (hasLooped) {
            const firstSeenIdx = path.indexOf(next);
            const trimmedPath = path.slice(firstSeenIdx);
            completeLoops.push(trimmedPath);
          }
          else {
            const newPath = clone(path);
            newPath.push(next);
            activeBranches.push(newPath);
          }
        }
        return activeBranches;
      });
    }
    console.log("LOOPS", completeLoops);
    loopsByComponent.push(completeLoops);
  }
  // consolidate: sort by length and exclude any loops
  // that have a shorter loop as a clear subset or contained loop
  const allFinalLoops = mapcat(loopsByComponent, completeLoops => {
    completeLoops.sort((a, b) => a.length - b.length);
    const seenLoopSigs = [];
    const finalLoops = [];
    for (const loop of completeLoops) {
      const sig = new Set(loop);
      const priorSig = seenLoopSigs.find(prior => sig.isSupersetOf(prior));
      if (priorSig) {
        // we've seen an equivalent loop or subloop already, move on
        continue;
      }
      const innerLoop = finalLoops.find(prior => roomContains(loop, prior));
      if (innerLoop) {
        // we've seen a smaller loop that fits inside this one already, move on
        continue;
      }
      seenLoopSigs.push(sig);
      finalLoops.push(loop);
    }
    console.log("FINAL LOOPS", finalLoops);
    return finalLoops;
  });
  return allFinalLoops;
}

function pointAlong([x1,y1], [x2,y2], amount) {
  return [x1 + (x2 - x1) * amount, y1 + (y2 - y1) * amount];
}

/// App state

const appState = {
  pegs: [],
  walls: [],
  rooms: [],
  doors: [], // list of wall keys that have doors
  activeWallAnchor: null,
  latestPeg: null,
  latestWall: null,
  mode: "delete", // "delete" or "door" atm
};

// init pegs
const CELL_SIZE = 10;
const GRID_SIZE = 20;
const MAP_SIZE = GRID_SIZE * CELL_SIZE;
for (let x = 0; x < GRID_SIZE; x++) {
  for (let y = 0; y < GRID_SIZE; y++) {
    appState.pegs.push({
      x: (x * CELL_SIZE) + (CELL_SIZE / 2),
      y: (y * CELL_SIZE) + (CELL_SIZE / 2),
    });
  }
}

/// UI

const e = React.createElement;

let root = null;
function renderUI() {
  if (!root) {
    root = ReactDOM.createRoot(document.getElementById("app"));
  }
  root.render(e(App, appState));
}

function App(props) {
  return [
    e(WorldEditor, props),
    e(RoomInspector, props),
  ];
}

function RoomInspector(props) {
  return e("div", {className: "room-inspector"},
    props.rooms.map((room, roomIdx) => {
      return e("div", {
          className: "room-data",
          style: {background: ROOM_COLORS[roomIdx % ROOM_COLORS.length]}
        },
        e("h3", {}, "Room " + roomIdx),
      );
    }),
  );
}

const ROOM_COLORS = [
  "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462",
  "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f",
];

function WorldEditor(props) {
  const drawGhostWall = canPlaceWall(appState.activeWallAnchor, appState.latestPeg);
  const walls = props.walls.concat(
    drawGhostWall ? [[appState.activeWallAnchor, appState.latestPeg]] : []
  );
  return e("div", {className: "world-editor"},
    e("div", {className: "editor-toolbar"},
      e("span", {}, "tools"),
      e("button", {
        className: props.mode === "delete" ? "active" : "",
        onClick: ev => {
          appState.mode = "delete";
          renderUI();
        }
      }, "delete"),
      e("button", {
        className: props.mode === "door" ? "active" : "",
        onClick: ev => {
          appState.mode = "door";
          renderUI();
        }
      }, "door"),
    ),
    e("svg", {viewBox: `0 0 ${MAP_SIZE} ${MAP_SIZE}`},
      // draw rooms
      props.rooms.map((room, roomIdx) => {
        return e("polygon", {
          className: "room", points: room.join(" "),
          fill: ROOM_COLORS[roomIdx % ROOM_COLORS.length],
        });
      }),
      // draw peg grid
      props.pegs.map(peg => {
        const pegKey = `${peg.x},${peg.y}`;
        const isHovered = pegKey === props.latestPeg;
        const isActive = props.activeWallAnchor === pegKey;
        const isPillar = props.walls.some(wall => wall[0] === pegKey || wall[1] === pegKey);
        return e("g", {className: "peg", key: pegKey},
          e("circle", {
            className: "peg-proper",
            cx: peg.x, cy: peg.y, r: (isHovered && 2) || (isPillar && 2) || 1,
            fill: (isActive && "red") || (isPillar && "black") || (isHovered && "#555") || "#ccc",
          }),
          e("rect", {
            className: "peg-catchment-zone",
            x: peg.x - (CELL_SIZE / 2), y: peg.y - (CELL_SIZE / 2),
            width: CELL_SIZE, height: CELL_SIZE,
            fill: "transparent",
            onMouseEnter: ev => {
              appState.latestPeg = pegKey;
              renderUI();
            },
            onClick: ev => {
              if (!appState.activeWallAnchor) {
                // set this up as a wall anchor
                appState.activeWallAnchor = pegKey;
                renderUI();
              }
              else if (appState.activeWallAnchor === pegKey) {
                // un-anchor this wall
                appState.activeWallAnchor = null;
                renderUI();
              }
              else if (canPlaceWall(appState.activeWallAnchor, pegKey)) {
                // place a wall
                const updatedWalls = addWall(appState.walls, [appState.activeWallAnchor, pegKey]);
                console.log("UPDATED", updatedWalls);
                appState.walls = updatedWalls;
                const rooms = findRooms(updatedWalls);
                console.log("ROOMS", rooms);
                appState.rooms = rooms;
                appState.activeWallAnchor = null;
                renderUI();
              }
              else {
                // can't place wall, do nothing
              }
            }
          }),
        );
      }),
      // draw walls
      walls.map(wall => {
        const [p1, p2] = wall;
        const wallKey = `${p1};${p2}`;
        const isHovered = wallKey === props.latestWall;
        const [x1, y1] = unpackPoint(p1);
        const [x2, y2] = unpackPoint(p2);
        const hasDoor = props.doors.includes(wallKey);
        let doorCoords = null;
        if (hasDoor) {
          const wallLength = calculateLength(wall);
          const doorWidthAsProportionOfWallLength = (0.4 * CELL_SIZE) / wallLength;
          doorCoords = [
            pointAlong([x1,y1], [x2,y2], 0.5 - doorWidthAsProportionOfWallLength),
            pointAlong([x1,y1], [x2,y2], 0.5 + doorWidthAsProportionOfWallLength),
          ];
        }
        return e("g", {className: "wall"},
          e("line", {
            className: "wall", key: wallKey,
            x1, y1, x2, y2, stroke: isHovered ? "red" : "black", strokeWidth: 2,
            onMouseEnter: ev => {
              appState.latestWall = wallKey;
              renderUI();
            },
            onMouseLeave: ev => {
              appState.latestWall = null;
              renderUI();
            },
            onClick: ev => {
              if (props.mode === "delete") {
                // DELETE MODE: get rid of this wall,
                // delete its associated door too if any,
                // and recalc rooms
                appState.walls = appState.walls.filter(wall => wall[0] !== p1 || wall[1] !== p2);
                appState.doors = appState.doors.filter(door => door !== wallKey);
                const rooms = findRooms(appState.walls);
                console.log("ROOMS", rooms);
                appState.rooms = rooms;
                renderUI();
              }
              else if (props.mode === "door") {
                // DOOR MODE: toggle whether this wall's got a door
                const doorExists = appState.doors.includes(wallKey);
                if (doorExists) {
                  appState.doors = appState.doors.filter(door => door !== wallKey);
                }
                else {
                  appState.doors.push(wallKey);
                }
                renderUI();
              }
            }
          }),
          hasDoor && e("line", {
            className: "door", stroke: "yellow", strokeWidth: 1,
            x1: doorCoords[0][0], y1: doorCoords[0][1],
            x2: doorCoords[1][0], y2: doorCoords[1][1],
            style: {pointerEvents: "none"}, // pass clicks thru to parent wall
          })
        );
      }),
      // draw pathing points debug view
      props.rooms.length > 0 && props.rooms.map(room => {
        const pathingPoints = pathingPointsInside(room);
        if (pathingPoints.length === 0) return null;
        return pathingPoints.map(point => e("circle", {
          className: "pathing-point", cx: point[0], cy: point[1],
          fill: "rgba(255,255,0,0.5)", r: 3,
        }));
      }),
      // TODO draw guys
    ),
  );
}

renderUI();
