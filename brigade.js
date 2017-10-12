const {events, Job, Group} = require("brigadier")

const ACTION_MOVE = "action_move_card_from_list_to_list"

events.on("trello", (e, p) => {
  // Parse the JSON payload from Trello.
  var hook = JSON.parse(e.payload)
  var d = hook.action.display
  var e = d.entities

  // Ignore other events. Just capture moves.
  if (d.translationKey != ACTION_MOVE) {
    return
  }

  // Store move record in CosmosDB
  var mongo = new Job("trello-db", "mongo:3.2")
  mongo.tasks = [
    "mongo",
    p.secrets.cosmosName + ".documents.azure.com:10255/test",
    "-u", p.secrets.cosmosName,
    "-p", p.secrets.cosmosKey,
    "--ssl",
    "--sslAllowInvalidCertificates",
    "--eval",
    `'db.trello.insert(${e.payload})'`
  ]

  // Message to send to Slack
  var m = `Card "${e.card.text}" moved from "${e.listBefore.text}" to "${e.listAfter.text}" <${hook.model.shortURL}>`

  // Slack job will send the message.
  var slack = new Job("slack-notify", "technosophos/slack-notify:latest", ["/slack-notify"])
  slack.env = {
    SLACK_WEBHOOK: p.secrets.SLACK_WEBHOOK,
    SLACK_USERNAME: "BrigadeBot",
    SLACK_TITLE: `Update to card ${e.card.text}`,
    SLACK_MESSAGE: m
  }
  Group.runEach([ mongo, slack ])

})
