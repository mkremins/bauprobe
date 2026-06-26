const Domain = {practices: []};

Domain.practices.push({
  id: "wander",
  name: "People can wander from room to room",
  roles: ["World"],
  actions: [{
    name: "[Actor]: Wander to [Room]",
    conditions: [
      "char.Actor.at.OldRoom",
      // uses adjacency data injected by the DM
      "room.OldRoom.connected.Room",
    ],
    outcomes: [
      "insert dm.Actor.planPath.Room",
    ],
    influences: [{
      name: "It's crowded in [OldRoom]",
      conditions: [
        "char.Other1.at.OldRoom", "char.Other2.at.OldRoom", "char.Other3.at.OldRoom",
        "neq Actor Other1", "neq Actor Other2", "neq Actor Other3",
        "neq Other1 Other2", "neq Other1 Other3",
        "neq Other2 Other3",
      ],
      score: 2,
    },
    {
      name: "[Actor] thinks [OldRoom] might be off limits",
      conditions: [
        "room.OldRoom.tag.secluded",
      ],
      score: 1,
    }],
  }]
});

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
    {
      name: "[Actor]: Start tending bar in [Room]",
      conditions: [
        "char.Actor.at.Room",
        "char.Actor.tag.host",
        "room.Room.tag.bar",
        "not practice.tendBar.Room",
      ],
      outcomes: [
        "insert practice.tendBar.Room.Actor",
        "insert dm.Actor.markBusy.100.hosting",
      ],
      influences: [{
        name: "Someone's gotta man the bar",
        conditions: [],
        score: 5,
      }]
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

Domain.practices.push({
  id: "tendBar",
  name: "[Bartender] is tending bar in [Room]",
  roles: ["Room", "Bartender"],
  init: [
    "insert practice.tendBar.Room.Bartender.ordersFulfilled!0",
  ],
  actions: [
    {
      name: "[Actor]: Order a [Drink] from [Bartender]",
      conditions: [
        "neq Actor Bartender",
        "char.Actor.at.Room",
        "not practice.drink.Actor.holdingDrink",
        "not practice.tendBar.Room.Bartender.order.Actor",
        "drink.Drink",
      ],
      outcomes: [
        "insert practice.tendBar.Room.Bartender.order.Actor!Drink",
        "insert dm.Actor.markBusy.100.Drink",
      ],
      influences: [{
        name: "[Actor] hasn't got a drink at the moment",
        conditions: [],
        score: 5,
      },
      // TODO people prefer to order drinks they like
      // TODO people who are already drunk want to keep drinking?
      // TODO people who abstain from alcohol don't order drinks
      ],
    },
    {
      name: "[Actor]: Fulfill [Customer]'s [Drink] order",
      conditions: [
        "eq Actor Bartender",
        "char.Actor.at.Room",
        "char.Customer.at.Room",
        "practice.tendBar.Room.Bartender.order.Customer.Drink",
        "not practice.drink.Customer.holdingDrink",
        "practice.tendBar.Room.Bartender.ordersFulfilled.Count",
        "calc NewCount add Count 1",
      ],
      outcomes: [
        "delete practice.tendBar.Room.Bartender.order.Customer",
        "insert practice.tendBar.Room.Bartender.ordersFulfilled!NewCount",
        "insert practice.drink.Customer", // TODO force spawn detection – resets drunkenness tho :(
        "insert practice.drink.Customer.holdingDrink!Drink.amount.5",
        "insert dm.Actor.markBusy.100.Drink",
      ],
      influences: [{
        name: "[Actor] ought to fulfill drink orders",
        conditions: [],
        priority: "required",
      },
      // TODO bartenders preferentially fulfill orders from those they like?
      ],
    },
    {
      // fallback action for an on-duty bartender who can't do anything else,
      // so they aren't forced by circumstance to wander into the next room
      // even though doing so is forbidden
      name: "[Actor]: Clean glass",
      conditions: ["eq Actor Bartender"],
      outcomes: ["insert dm.Actor.markBusy.100.hosting"],
    },
    {
      name: "[Actor]: Wrap up bartending shift",
      conditions: [
        "eq Actor Bartender",
        "practice.tendBar.Room.Bartender.ordersFulfilled.Count",
        "gt Count 5",
      ],
      outcomes: [
        "delete practice.tendBar.Room",
        "insert dm.Actor.markBusy.100.sighing",
      ],
      influences: [{
        name: "[Actor] has fulfilled a lot of orders already",
        conditions: [
          "practice.tendBar.Room.Bartender.ordersFulfilled.Count",
          "gt Count 10",
          "calc Weight sub Count 10",
        ],
        score: "Weight",
      }],
    },
  ],
  volitions: [{
    name: "[Bartender] can't leave [Room] while on duty",
    conditions: [
      "dm.Bartender.planPath.TargetRoom",
      "neq TargetRoom Room",
    ],
    priority: "forbidden",
  },
  {
    name: "[Customer] shouldn't leave [Room] while waiting for a drink",
    conditions: [
      "practice.tendBar.Room.Bartender.order.Customer",
      "dm.Customer.planPath.TargetRoom",
      "neq TargetRoom Room",
    ],
    score: -5
  }]
});

Domain.practices.push({
  id: "drink",
  name: "[Drinker] is drinking",
  roles: ["Drinker"],
  init: [
    "insert practice.drink.Drinker.drunkenness!0",
  ],
  actions: [
    {
      name: "[Actor]: Sip [Drink]",
      conditions: [
        "eq Actor Drinker",
        "practice.drink.Actor.holdingDrink.Drink.amount.Amount",
        "gt Amount 1",
        "calc NewAmount sub Amount 1",
        "practice.drink.Actor.drunkenness.Drunkenness",
        "calc NewDrunkenness add Drunkenness 1",
      ],
      outcomes: [
        "insert practice.drink.Actor.holdingDrink!Drink.amount.NewAmount",
        "insert practice.drink.Actor.drunkenness!NewDrunkenness",
        "insert dm.Actor.markBusy.100.Drink",
      ],
      influences: [{
        name: "People like drinking",
        conditions: [],
        score: 1,
      }],
    },
    {
      name: "[Actor]: Finish [Drink]",
      conditions: [
        "eq Actor Drinker",
        "practice.drink.Actor.holdingDrink.Drink.amount.Amount",
        "eq Amount 1",
        "practice.drink.Actor.drunkenness.Drunkenness",
        "calc NewDrunkenness add Drunkenness 1",
      ],
      outcomes: [
        "delete practice.drink.Actor.holdingDrink",
        "insert practice.drink.Actor.drunkenness!NewDrunkenness",
        "insert dm.Actor.markBusy.100.relaxing",
      ],
      influences: [{
        name: "People like drinking",
        conditions: [],
        score: 1,
      }],
    },
    {
      name: "[Actor]: Chug [Drink]",
      conditions: [
        "eq Actor Drinker",
        "practice.drink.Actor.holdingDrink.Drink.amount.Amount",
        "gt Amount 1",
        "practice.drink.Actor.drunkenness.Drunkenness",
        "calc NewDrunkenness add Drunkenness Amount",
      ],
      outcomes: [
        "delete practice.drink.Actor.holdingDrink",
        "insert practice.drink.Actor.drunkenness!NewDrunkenness",
        "insert dm.Actor.markBusy.100.drunk",
      ],
      influences: [{
        name: "Rowdy people like to chug their drinks",
        conditions: ["char.Actor.tag.rowdy"],
        score: 1,
      }],
    },
  ]
});

Domain.initSentences = [
  // initial practice instances
  "practice.wander.world",
  "practice.greet.world",
  "practice.fsf.world",
  // conversation topics
  "topic.animals.connected.nature",
  "topic.nature.connected.animals",
  "topic.nature.connected.travel",
  "topic.travel.connected.nature",
  "topic.travel.connected.food",
  "topic.food.connected.travel",
  // drinks
  "drink.dryCocktail",
  "drink.fruityCocktail",
  "drink.whiskey",
  "drink.wine",
  "drink.beer",
];
