const Domain = {};

Domain.greetPractice = {
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
};

Domain.initSentences = [
  // greeting practice
  "practice.greet.world",
  // TODO topical conversation, one per room?
  // TODO flirting between one agent pair?
  // maybe the above should be on fundamentalSocialFabric...
];
