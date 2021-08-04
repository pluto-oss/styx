import {DateTime} from "luxon";

export default class ReactionPingInstance {
    constructor(bot, data) {
        this.start(bot, data);
    }

    async start(bot, data) {
        this.channel = await bot.client.channels.fetch(data.channel);

        for (let msgdata of data.messages) {
            let msg = await this.channel.messages.fetch(msgdata.message);
            let collector = msg.createReactionCollector(() => true, {dispose: true});

            collector.on("collect", async (react, user) => {
                let member = await channel.guild.members.fetch(user.id);
                if (member.roles.cache.get(msgdata.role)) {
                    return;
                }
                member.roles.add(msgdata.role);

                if (msgdata.updatechannel) {
                    let updatechannel = await bot.client.channels.fetch(msgdata.updatechannel);
                    updatechannel.send(`<@${user.id}> has joined [account created at ${Math.floor(DateTime.fromJSDate(user.createdAt).diffNow().negate().as("days"))} days ago, joined ${Math.floor(DateTime.fromJSDate(gmember.joinedAt).diffNow().negate().as("days"))} days ago]`);
                }
            });

            collector.on("remove", async (react, user) => {
                let member = await channel.guild.members.fetch(user.id);
                if (member.roles.cache.get(msgdata.role)) {
                    member.roles.remove(msgdata.role);
                }
            });

            collector.on("end", () => console.log(`${msgdata.message} collector ended?`));
        }
    }
};
