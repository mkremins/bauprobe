const Domain = {practices: []};

Domain.practices.push({
  id: "greet",
  name: "People can greet one another",
  roles: ["World"],
  actions: [
    {
      name: "[Actor]: Greet [Other]",
      conditions: [
        "char.Actor.at.Room",
        "char.Other.at.Room",
        "neq Actor Other",
        "not practice.greet.World.alreadyGreeted.Actor.Other"
      ],
      outcomes: [
        "insert practice.greet.World.alreadyGreeted.Actor.Other",
        "insert dm.Actor.markBusy.100.greeting",
      ],
      influences: [{
        name: "Greetings should be reciprocated",
        conditions: ["practice.greet.World.alreadyGreeted.Other.Actor"],
        priority: "required",
      },
      {
        name: "[Actor] is friends with [Other]",
        conditions: ["char.Actor.friends.Other"],
        score: 5,
      },
      {
        name: "[Actor] is outgoing and hasn't yet met [Other]",
        conditions: [
          "char.Actor.tag.outgoing",
          "not char.Actor.friends.Other"
        ],
        score: 2,
      }],
    }
  ]
});

Domain.practices.push({
  id: "fsf", // fundamental social fabric
  name: "People can initiate basic social interactions",
  roles: ["World"],
  actions: [
    {
      name: "[Actor]: Strike up a conversation in [Room]",
      conditions: [
        "char.Actor.at.Room",
        "char.Other.at.Room",
        "neq Actor Other",
        // TODO need to check Other not busy?
        "not practice.yap.Room",
      ],
      outcomes: [
        "insert practice.yap.Room",
        "insert dm.Actor.markBusy.100.speaking",
        "insert dm.Other.markBusy.100.speaking",
      ],
    },
    {
      name: "[Actor]: Start flirting with [Other]",
      conditions: [
        "char.Actor.at.Room",
        "char.Other.at.Room",
        "neq Actor Other",
        // TODO need to check Other not busy?
        "not practice.flirt.Actor.Other",
        "not practice.flirt.Other.Actor",
      ],
      outcomes: [
        "insert practice.flirt.Actor.Other",
        "insert dm.Actor.markBusy.100.flirting",
        "insert dm.Other.markBusy.100.looking",
      ],
    },
  ]
});

Domain.practices.push({
  id: "yap",
  name: "People can yap about various topics",
  roles: ["Room"],
  init: [
    "insert practice.yap.Room.lastTopic.nothing",
    "insert practice.yap.Room.turnsOnTopic.0"
  ],
  actions: [
    {
      name: "[Actor]: Keep talking about [Topic]",
      conditions: [
        "char.Actor.at.Room",
        "char.Other.at.Room",
        "neq Actor Other",
        // TODO need to check Other not busy?
        "practice.yap.Room.lastTopic.Topic",
        "neq Topic nothing",
        "practice.yap.Room.turnsOnTopic.Turns",
        "calc NextTurnCount add Turns 1",
      ],
      outcomes: [
        "insert practice.yap.Room.turnsOnTopic!NextTurnCount",
        "insert dm.Actor.markBusy.100.Topic",
        //"insert dm.Other.markBusy.100.Topic",
      ],
      influences: [{
        name: "We're already talking about [Topic]",
        conditions: ["practice.yap.Room.lastTopic.Topic"],
        score: 2,
      }],
    },
    {
      name: "[Actor]: Start talking about [Topic]",
      conditions: [
        "char.Actor.at.Room",
        "char.Other.at.Room",
        "neq Actor Other",
        // TODO need to check Other not busy?
        "practice.yap.Room.lastTopic.OldTopic",
        "topic.Topic",
        "neq Topic OldTopic",
      ],
      outcomes: [
        "insert practice.yap.Room.lastTopic!Topic",
        "insert practice.yap.Room.turnsOnTopic!1",
        "insert dm.Actor.markBusy.100.Topic",
        //"insert dm.Other.markBusy.100.Topic",
      ],
      influences: [{
        name: "[Topic] is related to [OldTopic]",
        conditions: [
          "practice.yap.Room.lastTopic.OldTopic",
          "topic.OldTopic.connected.Topic"
        ],
        score: 1.5,
      },
      {
        name: "We've been talking about [OldTopic] for a while",
        conditions: [
          "practice.yap.Room.turnsOnTopic.Turns",
          "gt Turns 3",
          "calc Weight sub Turns 3"
        ],
        score: "Weight",
      },
      {
        name: "Right now we're not talking about anything",
        conditions: ["practice.yap.Room.lastTopic.nothing"],
        score: 1,
      }],
    },
  ],
  volitions: [{
    name: "[Actor] is interested in [Topic]",
    conditions: [
      "char.Actor.interest.Topic",
      "practice.yap.Room.lastTopic.Topic"
    ],
    score: 1,
  },
  {
    name: "[Actor]'s friend [Friend] is interested in [Topic]",
    conditions: [
      "char.Actor.friends.Friend",
      "char.Friend.interest.Topic",
      "practice.yap.Room.lastTopic.Topic"
    ],
    score: 0.5,
  }]
});

Domain.practices.push({
  id: "flirt",
  name: "[Initiator] is flirting with [Responder]",
  roles: ["Initiator", "Responder"],
  init: [
    "insert practice.flirt.Initiator.Responder.member.Initiator",
    "insert practice.flirt.Initiator.Responder.member.Responder",
    "insert practice.flirt.Initiator.Responder.heat.0",
  ],
  actions: [
    {
      name: "[Actor]: Flirt with [Other]",
      conditions: [
        "practice.flirt.Initiator.Responder.member.Actor",
        "practice.flirt.Initiator.Responder.member.Other",
        "neq Actor Other",
        "char.Actor.at.Room",
        "char.Other.at.Room",
        // TODO need to check Other not busy?
        "practice.flirt.Initiator.Responder.heat.Heat",
        "calc NextHeat add Heat 1",
      ],
      outcomes: [
        "insert practice.flirt.Initiator.Responder.heat!NextHeat",
        "insert dm.Actor.markBusy.100.flirting",
        //"insert dm.Other.markBusy.100.looking",
      ],
      influences: [{
        name: "If you're flirting... keep flirting",
        conditions: [],
        score: 2,
      },
      {
        name: "It's easier to flirt in private",
        conditions: [
          "room.Room.tag.secluded",
        ],
        score: 1,
      }],
    },
    {
      name: "[Actor]: Proposition [Other]",
      conditions: [
        "not practice.flirt.Initiator.Responder.status.makeOrBreak",
        "practice.flirt.Initiator.Responder.member.Actor",
        "practice.flirt.Initiator.Responder.member.Other",
        "neq Actor Other",
        "char.Actor.at.Room",
        "char.Other.at.Room",
        // TODO need to check Other not busy?
        "practice.flirt.Initiator.Responder.heat.Heat",
        "gt Heat 3",
      ],
      outcomes: [
        "insert practice.flirt.Initiator.Responder.status!makeOrBreak.Actor",
        "insert dm.Actor.markBusy.100.smirking",
        //"insert dm.Other.markBusy.100.looking",
      ],
      influences: [{
        name: "The flirting keeps escalating",
        conditions: [
          "practice.flirt.Initiator.Responder.heat.Heat",
          "gt Heat 3",
          "calc AdjustedHeat sub Heat 2",
        ],
        score: "AdjustedHeat",
      }],
    },
    {
      name: "[Actor]: Accept [Other]'s proposition",
      conditions: [
        "practice.flirt.Initiator.Responder.status.makeOrBreak.Other",
        "practice.flirt.Initiator.Responder.member.Actor",
        "practice.flirt.Initiator.Responder.member.Other",
        "neq Actor Other",
        "char.Actor.at.Room",
        "char.Other.at.Room",
        // TODO need to check Other not busy?
        "room.TargetRoom.tag.secluded",
      ],
      outcomes: [
        // reset flirtation state
        "delete practice.flirt.Initiator.Responder.status",
        "insert practice.flirt.Initiator.Responder.heat!0",
        // send them to the TargetRoom to make out
        "insert practice.makeout.Actor.Other",
        "insert dm.Actor.planPath.TargetRoom",
        "insert dm.Other.planPath.TargetRoom",
      ],
      influences: [{
        name: "The ball's in your court",
        conditions: [],
        priority: "required",
      }],
    },
    {
      name: "[Actor]: Reject [Other]'s proposition",
      conditions: [
        "practice.flirt.Initiator.Responder.status.makeOrBreak.Other",
        "practice.flirt.Initiator.Responder.member.Actor",
        "practice.flirt.Initiator.Responder.member.Other",
        "neq Actor Other",
        "char.Actor.at.Room",
        "char.Other.at.Room",
        // TODO need to check Other not busy?
      ],
      outcomes: [
        "delete practice.flirt.Initiator.Responder.status",
        "insert practice.flirt.Initiator.Responder.heat!0",
        "insert dm.Actor.markBusy.100.rejecting",
        "insert dm.Other.markBusy.100.shrugging",
      ],
      influences: [{
        name: "The ball's in your court",
        conditions: [],
        priority: "required",
      }],
    },
  ]
});

Domain.practices.push({
  id: "makeout",
  name: "[Initiator] is making out with [Responder]",
  roles: ["Initiator", "Responder"],
  init: [
    "insert practice.makeout.Initiator.Responder.member.Initiator",
    "insert practice.makeout.Initiator.Responder.member.Responder",
  ],
  actions: [
    {
      name: "[Actor]: Make out with [Other]",
      conditions: [
        "practice.makeout.Initiator.Responder.member.Actor",
        "practice.makeout.Initiator.Responder.member.Other",
        "neq Actor Other",
        "char.Actor.at.Room",
        "char.Other.at.Room",
        "room.Room.tag.secluded",
        // TODO need to check Other not busy?
      ],
      outcomes: [
        "insert dm.Actor.markBusy.500.kissing",
        "insert dm.Other.markBusy.500.kissing",
        "delete practice.makeout.Initiator.Responder",
      ],
      influences: [{
        name: "We came here for a reason",
        conditions: [],
        priority: "required",
      }],
    },
  ]
});

Domain.initSentences = [
  // initial practice instances
  "practice.greet.world",
  "practice.fsf.world",
  // conversation topics
  "topic.animals.connected.nature",
  "topic.nature.connected.animals",
  "topic.nature.connected.travel",
  "topic.travel.connected.nature",
  "topic.travel.connected.food",
  "topic.food.connected.travel",
];
