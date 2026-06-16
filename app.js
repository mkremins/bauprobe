/// Utils

function avg(xs) {
  return sum(xs) / xs.length;
}

function mapcat(xs, f) {
  const ys = [];
  for (let i = 0; i < xs.length; i++) {
    for (const y of f(xs[i], i) || []) {
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

function bfs(graph, init, target) {
  const queue = [init];
  const parent = {};
  while (queue.length > 0) {
    const here = queue.shift();
    if (here === target) {
      // reconstruct path
      const path = [];
      let prev = here;
      while (prev !== init) {
        path.push(prev);
        prev = parent[prev];
      }
      return path.reverse();
    }
    for (const next of graph[here] || []) {
      if (parent[next]) continue; // seen it already
      queue.push(next);
      parent[next] = here;
    }
  }
  return null; // never found target
}

/// Geometry

function distance([x1, y1], [x2, y2]) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function pointAlong([x1,y1], [x2,y2], amount) {
  return [x1 + (x2 - x1) * amount, y1 + (y2 - y1) * amount];
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

function splitWall(wall, splitPoints) {
  if (splitPoints.length === 0) return [wall];
  const allPoints = wall.concat(splitPoints);
  allPoints.sort((a, b) => {
    const [ax, ay] = unpackPoint(a);
    const [bx, by] = unpackPoint(b);
    return (ax - bx) || (ay - by);
  }); // sort by grid order i guess?
  const splitSections = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const section = [allPoints[i], allPoints[i+1]];
    splitSections.push(section);
  }
  return splitSections;
}

function addWall(oldWalls, newWall) {
  const collisions = mapcat(oldWalls, oldWall => findCollisions(oldWall, newWall));
  //console.log("COLLISIONS", collisions);
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
    //console.log("SPLITS", newWallSplits, splitsPerOldWall);
    const newWallSections = splitWall(newWall, Array.from(newWallSplits));
    const updatedOldWalls = mapcat(oldWalls, oldWall => {
      const oldWallKey = JSON.stringify(oldWall);
      const oldWallSplits = splitsPerOldWall[oldWallKey] || [];
      return splitWall(oldWall, Array.from(oldWallSplits));
    });
    // FIXME there's a bug where we can sometimes add zero-length sections;
    // this is currently being filtered downstream in `rebuildWorld`,
    // but we might want to move this filtering upstream
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
    //console.log("UNSEEN POINTS", pointsNotSeenYet);
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
    //console.log("LOOPS", completeLoops);
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
    //console.log("FINAL LOOPS", finalLoops);
    return finalLoops;
  });
  return allFinalLoops;
}

function roomHasWall(room, wall) {
  // room is array of packed (string) points, wall is wall key
  const [wallP1, wallP2] = wall.split(";");
  const wallIdx1 = room.indexOf(wallP1);
  const wallIdx2 = room.indexOf(wallP2);
  const theyreBothInThere = wallIdx1 > -1 && wallIdx2 > -1;
  const theyreNextToEachOther = Math.abs(wallIdx2 - wallIdx1) === 1;
  const oneIsFirstOneIsLast =
    (wallIdx1 === 0 && wallIdx2 === room.length - 1) ||
    (wallIdx2 === 0 && wallIdx1 === room.length - 1);
  return theyreBothInThere && (theyreNextToEachOther || oneIsFirstOneIsLast);
}

function buildRoomGraph(rooms, doors) {
  const adjacencies = {};
  for (const door of doors) {
    const roomsJoinedByDoor = rooms.filter(room => roomHasWall(room, door));
    for (const room of roomsJoinedByDoor) {
      const roomKey = room.join(";");
      adjacencies[roomKey] = adjacencies[roomKey] || [];
      adjacencies[roomKey].push(door);
      adjacencies[door] = adjacencies[door] || [];
      adjacencies[door].push(roomKey);
    }
  }
  return adjacencies;
}

function buildNavMesh(room, doors) {
  const THRESHOLD = Math.sqrt(2 * (CELL_SIZE * CELL_SIZE));
  const adjacencies = {};
  const pathingPoints = pathingPointsInside(room);
  // first, mark all sufficiently close-together pathing points as adjacent
  for (const point of pathingPoints) {
    const pointKey = `${point[0]},${point[1]}`;
    const adjacent = pathingPoints.filter(other => {
      const dist = distance(point, other);
      return dist <= THRESHOLD && dist > 0;
    });
    for (const adj of adjacent) {
      const adjKey = `${adj[0]},${adj[1]}`;
      adjacencies[pointKey] = adjacencies[pointKey] || new Set();
      adjacencies[pointKey].add(adjKey);
      adjacencies[adjKey] = adjacencies[adjKey] || new Set();
      adjacencies[adjKey].add(pointKey);
    }
  }
  // then, mark the closest pathing points for each door
  for (const door of doors) {
    if (pathingPoints.length === 0) {
      // there are no pathing points in this room!
      // so we'll just set all the room's doors directly adjacent to each other.
      for (const other of doors) {
        if (door === other) continue;
        adjacencies[door] = adjacencies[door] || new Set();
        adjacencies[door].add(other);
        adjacencies[other] = adjacencies[other] || new Set();
        adjacencies[other].add(door);
      }
      continue;
    }
    // find the door's midpoint and the closest pathing points
    const [doorP1, doorP2] = door.split(";").map(unpackPoint);
    const doorPoint = pointAlong(doorP1, doorP2, 0.5);
    pathingPoints.sort((a, b) => {
      const distToA = distance(doorPoint, a);
      const distToB = distance(doorPoint, b);
      return distToA - distToB;
    });
    const minDist = distance(doorPoint, pathingPoints[0]);
    const closest = takeWhile(p => distance(p, doorPoint) === minDist, pathingPoints);
    // mark all closest pathing points as adjacent to the door, in both directions
    for (const close of closest) {
      const pointKey = `${close[0]},${close[1]}`;
      adjacencies[pointKey] = adjacencies[pointKey] || new Set();
      adjacencies[pointKey].add(door);
      adjacencies[door] = adjacencies[door] || new Set();
      adjacencies[door].add(pointKey);
    }
  }
  for (const key of Object.keys(adjacencies)) {
    adjacencies[key] = Array.from(adjacencies[key]); // de-setify
  }
  return adjacencies;
}

// Given a `world` datastructure containing at minimum `walls` and `doors`,
// and perhaps containing other stuff (e.g., `roomData`), rebuild all derived
// world data:
// - Clean up ghost walls and ghost doors if any
// - Identify rooms
// - Build room graph
// - Build per-room navmeshes
// - Copy over room data as appropriate
// ...and return an updated datastructure wrapping all of the above.
// `walls` are represented as two-element arrays of packed (string) points.
// `doors` are represented as wall keys.
function rebuildWorld(world) {
  // clean up ghost walls if any
  const walls = world.walls.filter(wall => wall[0] !== wall[1]);
  // clean up ghost doors if any
  const doors = world.doors.filter(door => {
    const doorPoints = door.split(";");
    return walls.find(([p1, p2]) => doorPoints.includes(p1) && doorPoints.includes(p2));
  });
  // identify rooms, build room graph
  const rooms = findRooms(walls);
  const roomGraph = buildRoomGraph(rooms, doors);
  // build a navmesh for every room
  const navmeshes = {};
  for (const room of rooms) {
    const roomKey = room.join(";");
    const doorsToRoom = doors.filter(door => roomHasWall(room, door));
    navmeshes[roomKey] = buildNavMesh(room, doorsToRoom);
  }
  // set up room data
  const roomData = {};
  for (const room of rooms) {
    const roomKey = room.join(";");
    const oldData = world.roomData[roomKey];
    // TODO this logic will preserve existing room data very conservatively;
    // we should try to be more proactive about shape matching in the future
    roomData[roomKey] = oldData || {tags: ""};
  }
  // return a bundle of updated world info
  const newWorld = {walls, doors, rooms, roomGraph, navmeshes, roomData};
  console.log("UPDATED WORLD", newWorld);
  return newWorld;
}

/// App state

let appState = {
  pegs: [],
  walls: [],
  rooms: [],
  doors: [], // list of wall keys that have doors
  activeWallAnchor: null,
  latestPeg: null,
  latestWall: null,
  mode: "delete", // "delete" or "door" or "sim" atm
  guys: [], // has pos, task, taskQueue
  roomData: {}, // keyed by roomKey, must gc when rooms change
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

/// Praxish

let appPraxishState = null;
function initPraxishState() {
  appPraxishState = Praxish.createPraxishState();
  // initial character setup – `char.Name` for each
  for (const guy of appState.guys) {
    Praxish.performOutcome(appPraxishState, `insert char.${guy.name}`);
  }
  // initial world setup – room tags and adjacencies
  for (const sentence of exportRoomData(appState)) {
    Praxish.performOutcome(appPraxishState, `insert ${sentence}`);
  }
  // define practices from domain
  for (const practiceDef of Domain.practices) {
    Praxish.definePractice(appPraxishState, practiceDef);
  }
  // spawn initial practice instances, initialize other domain-specified state
  for (const sentence of Domain.initSentences) {
    Praxish.performOutcome(appPraxishState, `insert ${sentence}`);
  }
  return appPraxishState;
}

// Given a `world` datastructure with a `roomGraph` and optional `roomData`,
// build and return a list of Praxish database facts that expose information
// about room tags and room connectivity to social actors.
function exportRoomData(world) {
  const sentences = [];
  const roomNames = {};
  // first expose room data (tags) if any
  for (const room of world.rooms) {
    const roomKey = room.join(";");
    const roomData = world.roomData?.[roomKey];
    const tags = roomData?.tags?.trim().split(/\s+/) || [];
    const roomName = tags[0] || roomKey;
    roomNames[roomKey] = roomName;
    for (const tag of tags.filter(str => str.length > 0)) {
      sentences.push(`room.${roomName}.tag.${tag}`);
    }
  }
  // then expose connected rooms: other rooms connected to this room's doors
  for (const room of world.rooms) {
    const roomKey = room.join(";");
    const roomName = roomNames[roomKey];
    const doors = world.roomGraph[roomKey];
    const connectedRoomKeys = mapcat(
      doors, door => world.roomGraph[door] || []
    ).filter(rk => rk !== roomKey);
    for (const connected of connectedRoomKeys) {
      const connectedName = roomNames[connected];
      sentences.push(`room.${roomName}.connected.${connectedName}`);
      sentences.push(`room.${connectedName}.connected.${roomName}`);
    }
  }
  return sentences;
}

function takePraxishTurn(guy) {
  // i guess we're assuming the guy is untasked at this point?
  const possibleActions = Swaygent.scoreActions(appPraxishState, guy) || [];
  if (possibleActions.length === 0) {
    console.warn("No actions to perform!", guy);
    return false;
  }
  const impossibleActions = possibleActions.impossibleActions;
  console.log("Considering actions", {guy, possibleActions, impossibleActions});
  const action = possibleActions[0]; // TODO better selection logic
  console.log("Performing action :: ", action);
  Praxish.performAction(appPraxishState, action);
  // query for and execute any newly added DM instructions
  const dmInstructions = Praxish.query(appPraxishState.db, [
    "dm.Char.InstructionType.Argument",
  ], {});
  for (const instruction of dmInstructions) {
    console.log("Executing DM instruction :: ", instruction);
    const guy = appState.guys.find(guy => guy.name === instruction.Char);
    if (instruction.InstructionType === "planPath") {
      const roomName = instruction.Argument;
      // find room with given room name if any
      const roomKey = Object.entries(appState.roomData).find((roomKey, data) => {
        return data.tags.startsWith(roomName) ? roomKey : null;
      }) || roomName;
      // pick random pathing point inside room
      const navmesh = appState.navmeshes[roomKey];
      const pathingPoints = Object.keys(navmesh);
      if (pathingPoints.length === 0) {
        console.warn("No pathing points in target room!", guy, roomName, roomKey, navmesh);
        return false; // TODO roll back action since it can't be completed?
      }
      const targetPos = unpackPoint(randNth(pathingPoints));
      // generate task queue from guy pos to there
      const fullPath = planPath(guy.pos, targetPos);
      if (!fullPath) {
        console.warn("No path to target room!", guy, roomName, roomKey, navmesh);
        return false; // TODO roll back action since it can't be completed?
      }
      guy.taskQueue = fullPath.map(point => ({type: "move", to: point}));
      // TODO explicitly mark char busy in Praxish DB?
      // (will the next simulation frame take care of this well enough?)
    }
    else if (instruction.InstructionType === "markBusy") {
      // parse out how long to mark guy as busy
      const duration = Number(instruction.Argument);
      if (!Number.isFinite(duration)) {
        console.warn("Invalid duration!", instruction, duration);
        return false; // TODO roll back action since it can't be completed?
      }
      // query for (optional) busy reason – could be used to play different
      // animations and such depending on why the guy's busy
      const busyReasonResults = Praxish.query(appPraxishState.db, [
        "dm.Char.InstructionType.Argument.Reason",
      ], {...instruction});
      const busyReason = busyReasonResults[0]?.Reason;
      // assign busy-waiting task of given duration
      const task = {type: "busy", ticksToWait: duration};
      if (busyReason) {
        task.reason = busyReason;
      }
      guy.taskQueue = [task];
      // TODO explicitly mark char busy in Praxish DB?
      // (will the next simulation frame take care of this well enough?)
    }
    else {
      console.warn("invalid DM instruction", instruction);
    }
  }
  // clear DM instructions
  Praxish.performOutcome(appPraxishState, "delete dm");
  return true;
}

/// Simulation

// Check if a character can navigate directly along a `line`
// (consisting of two packed points) without passing through any `walls`.
function isObstructed(line, walls) {
  return walls.some(wall => findIntersection(line, wall));
}

// Return the point in `navmesh` that's nearest to the given (unpacked) `pos`.
function closestPathingPoint(pos, navmesh) {
  const pathingPoints = [...Object.keys(navmesh)].map(unpackPoint);
  pathingPoints.sort((a, b) => distance(a, pos) - distance(b, pos));
  return pathingPoints[0];
}

// Given a pair of points `initPos` and `targetPos` (currently assumed to be
// within rooms but not guaranteed to be pathing points), assemble and return
// a sequence of points that represent an unobstructed path between them.
// If no such path is possible, return null.
function planPath(initPos, targetPos) {
  const packedInitPos = initPos.join(",");
  const packedTargetPos = targetPos.join(",");
  const initRoom = appState.rooms.find(room => pointInsidePolygon(packedInitPos, room));
  const initRoomKey = initRoom.join(";");
  const targetRoom = appState.rooms.find(room => pointInsidePolygon(packedTargetPos, room));
  const targetRoomKey = targetRoom.join(";");
  console.log(
    "pathing from", packedInitPos, "in room", initRoomKey,
    "to", packedTargetPos, "in room", targetRoomKey
  );
  const pathingWithinRoom = initRoomKey === targetRoomKey;
  if (pathingWithinRoom) {
    if (!isObstructed([packedInitPos, packedTargetPos], appState.walls)) {
      return [targetPos]; // no obstructions, just beeline to target
    }
    // there's a wall between initPos and targetPos, use the navmesh to avoid it
    const navmesh = appState.navmeshes[initRoomKey];
    const nearPathingPos = closestPathingPoint(initPos, navmesh).join(",");
    const farPathingPos = closestPathingPoint(targetPos, navmesh).join(",");
    const navmeshPath = bfs(navmesh, nearPathingPos, farPathingPos);
    if (!navmeshPath) {
      console.warn("no path within room?!", initRoomKey, initPos, targetPos);
      return null;
    }
    return [...navmeshPath.map(unpackPoint), targetPos];
  }
  const roomsAndDoorsPath = bfs(appState.roomGraph, initRoomKey, targetRoomKey);
  console.log("roomsAndDoorsPath", roomsAndDoorsPath);
  if (!roomsAndDoorsPath) {
    // no path from init room to target room :(
    return null;
  }
  const pathPrefix = (() => {
    // this is the beginning of the path (the room we're already in).
    // beeline to first door if unobstructed...
    const firstDoor = roomsAndDoorsPath[0];
    const [doorP1, doorP2] = firstDoor.split(";").map(unpackPoint);
    const firstDoorPos = pointAlong(doorP1, doorP2, 0.5).join(",");
    const relevantWalls = appState.walls.filter(
      // exclude the wall containing the target door
      wall => !wall.includes(doorP1.join(",")) || !wall.includes(doorP2.join(","))
    );
    if (!isObstructed([packedInitPos, firstDoorPos], relevantWalls)) {
      return []; // no obstructions, just beeline to first door
    }
    // ...else navmesh path from closest pathing point
    const navmesh = appState.navmeshes[initRoomKey];
    const nearPathingPos = closestPathingPoint(initPos, navmesh).join(",");
    const navmeshPath = bfs(navmesh, nearPathingPos, firstDoor);
    if (!navmeshPath) {
      console.warn("no path to door?!", initRoomKey, initPos, firstDoor);
      return null;
    }
    navmeshPath.pop(); // exclude final point (the door) to avoid pausing there
    return navmeshPath.map(unpackPoint);
  })();
  const innerPath = mapcat(roomsAndDoorsPath, (roomOrDoor, idx) => {
    if (roomOrDoor === targetRoomKey) {
      // this is the end of the path (the target room).
      // beeline from last door if unobstructed...
      const lastDoor = roomsAndDoorsPath[idx - 1];
      const [doorP1, doorP2] = lastDoor.split(";").map(unpackPoint);
      const lastDoorPos = pointAlong(doorP1, doorP2, 0.5).join(",");
      const relevantWalls = appState.walls.filter(
        // exclude the wall containing the target door
        wall => !wall.includes(doorP1.join(",")) || !wall.includes(doorP2.join(","))
      );
      if (!isObstructed([lastDoorPos, packedTargetPos], relevantWalls)) {
        return []; // no obstructions, just beeline to first door
      }
      // ...else navmesh path from closest pathing point
      const navmesh = appState.navmeshes[targetRoomKey];
      const nearPathingPos = closestPathingPoint(targetPos, navmesh).join(",");
      const navmeshPath = bfs(navmesh, lastDoor, nearPathingPos);
      if (!navmeshPath) {
        console.warn("no path from door?!", targetRoomKey, lastDoor, targetPos);
        return null;
      }
      navmeshPath.pop(); // exclude final point (the door) to avoid pausing there
      return navmeshPath.map(unpackPoint);
    }
    const points = roomOrDoor.split(";").map(unpackPoint);
    if (points.length === 2) {
      // it's a door! yield center
      return [pointAlong(points[0], points[1], 0.5)];
    }
    else if (points.length > 2) {
      // it's a room! yield path along its navmesh
      // TODO or a straight-line shortcut if door->door path is unobstructed?
      const navmesh = appState.navmeshes[roomOrDoor];
      console.log("navmesh", navmesh);
      const sourceDoor = roomsAndDoorsPath[idx - 1];
      const targetDoor = roomsAndDoorsPath[idx + 1];
      console.log("doors", sourceDoor, targetDoor);
      const navmeshPath = bfs(navmesh, sourceDoor, targetDoor);
      console.log("navmeshPath", navmeshPath);
      const finalNavmeshPath = navmeshPath || []; // fallback: straight line thru room
      // FIXME maybe use centroid or random navmesh point for fallback instead?
      return finalNavmeshPath.map(pointOrDoor => {
        const bits = pointOrDoor.split(";")
        if (bits.length === 1) {
          return unpackPoint(pointOrDoor);
        }
        else if (bits.length === 2) {
          return pointAlong(...bits.map(unpackPoint), 0.5);
        }
        else {
          // should never get here
          console.warn("invalid navmesh path component!", pointOrDoor);
          return [0, 0]; // ???
        }
      });
    }
    else {
      // should never get here
      console.warn("invalid room or door in path!", roomOrDoor);
      return [];
    }
  });
  const fullPath = [initPos, ...pathPrefix, ...innerPath, targetPos];
  console.log("fullPath", fullPath);
  return fullPath;
}

// Assemble and return a fresh new task queue for the given `guy`.
// At the moment this will task them either with moving to a random
// pathing point in the world or waiting for a fixed amount of time.
function assignRandomGoal(guy) {
  const FALLBACK_GOAL = [{type: "wait", ticksToWait: 100}];
  if (Math.random() < 0.5) return FALLBACK_GOAL; // randomly wait sometimes
  const possibleTargets = mapcat(appState.rooms, room => pathingPointsInside(room));
  if (possibleTargets.length === 0) {
    // no viable target anywhere, bail out early
    return FALLBACK_GOAL;
  }
  const targetPos = randNth(possibleTargets);
  const path = planPath(guy.pos, targetPos);
  return path?.map(point => ({type: "move", to: point})) || FALLBACK_GOAL;
}

// Generate a random character name.
function generateCharName() {
  const cons = "bcdfghjklmnpqrstvwxyz".split("");
  const vows = "aeiou".split("");
  return [
    randNth(cons), randNth(vows),
    randNth(cons), randNth(vows),
    randNth(cons), randNth(vows),
  ].join("");
}

// Spawn a new guy inside the given `room`, assign them a random goal,
// and return them so that they can be added to `appState.guys`.
function spawnGuy(room) {
  const pathingPoints = pathingPointsInside(room);
  if (pathingPoints.length === 0) return;
  const initPos = randNth(pathingPoints);
  const guy = {type: "guy", pos: initPos, name: generateCharName()};
  guy.taskQueue = assignRandomGoal(guy);
  return guy;
}

// Return whether the current task of the given `guy` has run to completion.
function hasCompletedCurrentTask(guy) {
  const task = guy.task;
  if (task.type === "move") {
    return task.amount >= 1;
  }
  else if (task.type === "wait" || task.type === "busy") {
    return task.ticksTaken >= task.ticksToWait;
  }
  else {
    console.warn("invalid current task type", guy);
    return true;
  }
}

// Progress the current task of the given `guy` by one tick.
function keepDoingCurrentTask(guy) {
  const task = guy.task;
  if (task.type === "move") {
    const oldPos = clone(guy.pos);
    guy.pos = pointAlong(task.from, task.to, task.amount);
    task.amount += task.amountPerFrame;
  }
  else if (task.type === "wait" || task.type === "busy") {
    task.ticksTaken += 1;
  }
  else {
    console.warn("invalid current task type", guy);
  }
}

// Check the task queue for the given `guy`, pull the next task off of it,
// and set the `guy` working on this task.
function startDoingNextTask(guy) {
  const task = guy.taskQueue.shift();
  if (task.type === "move") {
    const MOVE_SPEED = 0.5;
    task.from = guy.pos;
    task.amount = 0;
    task.amountPerFrame = MOVE_SPEED / distance(task.from, task.to);
  }
  else if (task.type === "wait" || task.type === "busy") {
    task.ticksTaken = 0;
  }
  else {
    console.warn("invalid next task type", guy, task);
  }
  guy.task = task;
  // Praxish update: flag as busy, except if task is waiting
  if (task.type !== "wait") {
    Praxish.performOutcome(appPraxishState, `insert char.${guy.name}.status!busy`);
  }
}

function tickSimulation() {
  // for each guy, decide what they should be doing
  for (const guy of appState.guys) {
    if (guy.task) {
      if (hasCompletedCurrentTask(guy)) {
        //console.log("completed task!", guy);
        delete guy.task;
        // Praxish update: flag as no longer busy
        Praxish.performOutcome(appPraxishState, `delete char.${guy.name}.status`);
        // Praxish update: set current room
        const packedGuyPos = guy.pos.join(",");
        const room = appState.rooms.find(room => pointInsidePolygon(packedGuyPos, room));
        if (room) {
          const roomKey = room.join(";");
          const roomName = appState.roomData[roomKey]?.tag?.trim().split(/s+/)[0] || roomKey;
          Praxish.performOutcome(appPraxishState, `insert char.${guy.name}.at!${roomName}`);
        }
        else {
          console.warn("Guy doesn't seem to be inside a room!", guy);
          Praxish.performOutcome(appPraxishState, `insert char.${guy.name}.at!beyond`);
        }
      }
      else {
        keepDoingCurrentTask(guy);
      }
    }
    else if (guy.taskQueue.length > 0) {
      startDoingNextTask(guy);
    }
    else {
      // find a new action to perform
      if (Math.random() < 0.2) {
        // randomly break out of social interaction sometimes
        // TODO atm this will skip out on required actions too; maybe we should
        // only try this if no actions are required
        guy.taskQueue = assignRandomGoal(guy);
      }
      else {
        // if not breaking out, try to take a Praxish turn
        const tookPraxishTurn = takePraxishTurn(guy);
        if (!tookPraxishTurn) {
          // if it failed, find something else to do
          guy.taskQueue = assignRandomGoal(guy);
        }
      }
    }
  }
  // show task progress
  renderUI();
  // queue up the next frame if still running the sim
  if (appState.mode !== "sim") return;
  requestAnimationFrame(tickSimulation);
}

function startSimulation() {
  // clear the preexisting guys
  appState.guys = [];
  // create a guy for each room
  for (const room of appState.rooms) {
    const guy = spawnGuy(room);
    if (!guy) continue;
    appState.guys.push(guy);
  }
  // create a fresh Praxish state
  initPraxishState();
  // start the sim loop
  requestAnimationFrame(tickSimulation);
}

/// Save files

// download a file to the user's machine
// based on https://stackoverflow.com/a/9834261
function downloadFile(filename, contents) {
  const blob = new Blob([contents]);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

// request a file from the user and pass its contents to `cb`
// note: can only be called from inside a user interaction handler (eg onclick)
// based on https://stackoverflow.com/a/63227449
function uploadFile(cb, opts) {
  const input = document.createElement("input");
  input.type = "file";
  if (opts?.fileType === "json") {
    input.accept = ".json";
  }
  else if (opts?.fileType === "image") {
    input.accept = ".png,.jpg,.jpeg";
  }
  input.onchange = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev2) {
      cb(reader.result);
    };
    if (opts?.fileType === "image") {
      reader.readAsDataURL(file);
    }
    else {
      reader.readAsText(file);
    }
  };
  document.body.appendChild(input);
  input.click();
  input.remove();
}

// download a JSON file representing the world
function exportWorld() {
  const dateTimeString = (new Date()).toISOString().split(".")[0].replace("T", "_").replaceAll(":", "-");
  const filename = `bauprobe_${dateTimeString}.json`;
  const saveState = clone(appState);
  for (const key of Object.keys(saveState)) {
    if (["walls","rooms","doors","roomData"].includes(key)) continue;
    delete saveState[key];
  }
  const contents = JSON.stringify(saveState);
  downloadFile(filename, contents);
}

// upload a JSON file representing the world
function importWorld() {
  uploadFile(contents => {
    const saveState = JSON.parse(contents);
    appState = {...appState, ...rebuildWorld(saveState)};
  }, {fileType: "json"});
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
      const roomKey = room.join(";");
      const roomData = props.roomData[roomKey] || {tags: ""};
      return e("div", {
          className: "room-data",
          style: {background: ROOM_COLORS[roomIdx % ROOM_COLORS.length]}
        },
        e("h3", {}, "Room " + roomIdx),
        e("input", {
          type: "text",
          value: roomData.tags,
          onChange: ev => {
            appState.roomData[roomKey].tags = ev.target.value;
            renderUI();
          },
          placeholder: "tags here…",
        }),
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
        onClick: ev => {
          importWorld();
          renderUI();
        }
      }, "import"),
      e("button", {
        onClick: ev => {
          exportWorld();
        }
      }, "export"),
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
      e("button", {
        className: props.mode === "sim" ? "active" : "",
        onClick: ev => {
          appState.mode = "sim";
          startSimulation();
          renderUI();
        }
      }, "sim"),
    ),
    e("svg", {viewBox: `0 0 ${MAP_SIZE} ${MAP_SIZE}`},
      // draw rooms
      props.rooms.map((room, roomIdx) => {
        const roomKey = room.join(";");
        return e("polygon", {
          key: roomKey,
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
                appState.walls = addWall(appState.walls, [appState.activeWallAnchor, pegKey]);
                appState = {...appState, ...rebuildWorld(appState)};
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
          const wallLength = distance([x1, y1], [x2, y2]);
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
                // DELETE MODE: get rid of this wall and recalc rooms
                appState.walls = appState.walls.filter(wall => wall[0] !== p1 || wall[1] !== p2);
                appState = {...appState, ...rebuildWorld(appState)};
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
                appState = {...appState, ...rebuildWorld(appState)};
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
      /*
      // draw pathing points debug view
      props.rooms.length > 0 && props.rooms.map(room => {
        const pathingPoints = pathingPointsInside(room);
        if (pathingPoints.length === 0) return null;
        return pathingPoints.map(point => e("circle", {
          className: "pathing-point", cx: point[0], cy: point[1],
          fill: "rgba(255,255,0,0.5)", r: 3,
        }));
      }),
      */
      // draw guys
      props.mode === "sim" && props.guys.map(guy => {
        const plannedMoves = [guy.task, ...guy.taskQueue].map(
          task => task?.type === "move" && task.to
        ).filter(x => x);
        const fullPath = [guy.pos, ...plannedMoves];
        const taskType = guy.task?.type;
        const doingStationaryTask = taskType === "wait" || taskType === "busy";
        const taskIcon = {
          greeting: "👋", speaking: "💬", flirting: "😘", kissing: "💋",
          animals: "🐻", nature: "🌲", travel: "🧳", food: "🍔",
        }[guy.task?.reason];
        const taskProgress = doingStationaryTask && (guy.task.ticksTaken / guy.task.ticksToWait);
        return e("g", {className: "guy-info"},
          fullPath.length > 0 && e("polyline", {
            className: "guy-path",
            points: fullPath.join(" "),
            stroke: "rgba(255,0,255,0.5)", fill: "none",
            strokeWidth: 1, strokeDasharray: 1,
          }),
          e("circle", {
            className: "guy", cx: guy.pos[0], cy: guy.pos[1],
            fill: "magenta", r: 2,
            stroke: {wait: "cyan", busy: "yellow"}[taskType] || "none",
            strokeWidth: (taskProgress && Math.sin(taskProgress * Math.PI)) || 0,
          }),
          taskIcon && e("text", {
            x: guy.pos[0], y: guy.pos[1],
            textAnchor: "middle", dominantBaseline: "middle",
            fontSize: 8 + (Math.sin(taskProgress * Math.PI) * 2),
          }, taskIcon),
        );
      }),
    ),
  );
}

renderUI();
