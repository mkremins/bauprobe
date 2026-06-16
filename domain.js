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
    }
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
