import {findTextChannelByName} from "#src/framework";
import {ChannelManager, TextChannel} from "discord.js";

enum CRON_ERROR_CODE {
    NEXT_MESSAGE_IGNORE = 1,
    MESSAGE_IGNORE= 2,
    RETURN = 3
}

class CounterFailed {
    private failed: number;
    private readonly cronName: string;

    constructor(cronName: string) {
        this.failed = 0;
        this.cronName = cronName;
    }

    async incrementFailed(): Promise<void> {
        this.failed++;
    }

    async resetFailed(): Promise<void> {
        this.failed = 0;
    }

    async getErrorCode(): Promise<CRON_ERROR_CODE> {
        if (this.failed === 3) {
            return CRON_ERROR_CODE.NEXT_MESSAGE_IGNORE;
        } else if (this.failed > 3) {
            return CRON_ERROR_CODE.MESSAGE_IGNORE;
        } else {
            return CRON_ERROR_CODE.RETURN;
        }
    }

    async sendMessageIgnore(channels: ChannelManager): Promise<void> {
        const channel = findTextChannelByName(channels, 'logs');
        await channel.send(`Plusieurs erreurs sont survenues sur le CRON : ${this.cronName}. Le prochain message d'erreur ne sera pas affiché.`);
    }

    async sendMessageError(channels: ChannelManager, error: Error) {
        const channel = findTextChannelByName(channels, 'logs');
        await channel.send(`Une erreur est survenue sur le CRON : ${this.cronName}. \n\n Message d'erreur : ${error.message}`);
    }
}

export { CRON_ERROR_CODE, CounterFailed };