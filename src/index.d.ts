declare module 'discord-akairo' {
    import {
        Client, ClientOptions, Collection, Message, MessageAttachment, MessageEmbed, MessageOptions, MessageEditOptions,
        User, GuildMember, Channel, Role, Emoji, Guild, PermissionResolvable, Snowflake
    } from 'discord.js';

    import { Database, Statement } from 'sqlite';
    import { Model, Promise as Bluebird } from 'sequelize';
    import * as EventEmitter from 'events';

    module 'discord.js' {
        export interface Message {
            util?: CommandUtil;
        }
    }

    export class AkairoError extends Error {
        public code: string;
    }

    export class AkairoClient extends Client {
        public constructor(options?: AkairoOptions & ClientOptions, clientOptions?: ClientOptions);

        protected _built: boolean;
        protected _loaded: boolean;

        public akairoOptions: AkairoOptions;
        public commandHandler: CommandHandler;
        public inhibitorHandler: InhibitorHandler;
        public listenerHandler: ListenerHandler;
        public ownerID: string | string[];
        public selfbot: boolean;
        public util: ClientUtil;

        public build(): this;
        public loadAll(): void;
        public login(token: string): Promise<string>;
    }

    export class AkairoHandler {
        public constructor(client: AkairoClient, options: AkairoHandlerOptions);

        public extensions: Set<string>;
        public categories: Collection<string, Category<string, AkairoModule>>;
        public readonly classToHandle: Function;
        public readonly client: AkairoClient;
        public readonly directory: string;
        public modules: Collection<string, AkairoModule>;

        public static readdirRecursive(directory: string): string[];

        protected _register(mod: AkairoModule, filepath?: string): void;
        protected _deregister(mod: AkairoModule): void;

        public add(filename: string): AkairoModule;
        public findCategory(name: string): Category<string, AkairoModule>;
        public load(thing: string | AkairoModule, isReload?: boolean): AkairoModule;
        public loadAll(): this;
        public reload(id: string): AkairoModule;
        public reloadAll(): this;
        public remove(id: string): AkairoModule;
        public removeAll(): this;
        public on(event: 'disable' | 'enable' | 'remove', listener: (mod: AkairoModule) => any): this;
        public on(event: 'load', listener: (mod: AkairoModule, isReload: boolean) => any): this;
    }

    export class AkairoModule {
        public constructor(id: string, exec: (...args: any[]) => any, options?: ModuleOptions);
        
        public category: Category<string, AkairoModule>;
        public readonly client: AkairoClient;
        public enabled: boolean;
        public readonly filepath: string;
        public readonly handler: AkairoHandler;
        public id: string;

        public disable(): boolean;
        public enable(): boolean;
        public exec(...args: any[]): any;
        public reload(): this;
        public remove(): this;
    }

    export class Argument {
        public constructor(command: Command, options: ArgumentOptions);

        public readonly client: AkairoClient;
        public command: Command;
        public description: string;
        public readonly handler: CommandHandler;
        public id: string;
        public index?: number;
        public limit: number;
        public match: ArgumentMatch | ArgumentMatchFunction;
        public prefix?: string | string[];
        public prompt?: ArgumentPromptOptions;
        public type: ArgumentType | ArgumentTypeFunction;

        public cast(word: string, message: Message, args?: any): Promise<any>;
        public collect(message: Message, args?: any, commandInput?: string): Promise<any>;
        public default(message: Message, args: any): any;
        public process(word: string, message: Message, args?: any): Promise<any>;
    }

    export class Category<K, V> extends Collection<K, V> {
        public constructor(id: string, iterable: Iterable<[K, V][]>);

        public id: string;

        public disableAll(): this;
        public enableAll(): this;
        public reloadAll(): this;
        public removeAll(): this;
    }

    export class ClientUtil {
        public constructor(client: AkairoClient);

        public readonly client: AkairoClient;

        public checkChannel(text: string, channel: Channel, caseSensitive?: boolean, wholeWord?: boolean): boolean;
        public checkEmoji(text: string, emoji: Emoji, caseSensitive?: boolean, wholeWord?: boolean): boolean;
        public checkGuild(text: string, guild: Guild, caseSensitive?: boolean, wholeWord?: boolean): boolean;
        public checkMember(text: string, member: GuildMember, caseSensitive?: boolean, wholeWord?: boolean): boolean;
        public checkRole(text: string, role: Role, caseSensitive?: boolean, wholeWord?: boolean): boolean;
        public checkUser(text: string, user: User, caseSensitive?: boolean, wholeWord?: boolean): boolean;
        public collection<K, V>(iterable: Iterable<[K, V][]>): Collection<K, V>;
        public compareStreaming(oldMember: GuildMember, newMember: GuildMember): number;
        public embed(data?: any): MessageEmbed;
        public fetchMemberIn(guild: Guild, id: string, cache?: boolean): Promise<GuildMember>;
        public resolveChannel(text: string, channels: Collection<Snowflake, Channel>, caseSensitive?: boolean, wholeWord?: boolean): Channel;
        public resolveChannels(text: string, channels: Collection<Snowflake, Channel>, caseSensitive?: boolean, wholeWord?: boolean): Collection<Snowflake, Channel>;
        public resolveEmoji(text: string, emojis: Collection<Snowflake, Emoji>, caseSensitive?: boolean, wholeWord?: boolean): Emoji;
        public resolveEmojis(text: string, emojis: Collection<Snowflake, Emoji>, caseSensitive?: boolean, wholeWord?: boolean): Collection<Snowflake, Emoji>;
        public resolveGuild(text: string, guilds: Collection<Snowflake, Guild>, caseSensitive?: boolean, wholeWord?: boolean): Guild;
        public resolveGuilds(text: string, guilds: Collection<Snowflake, Guild>, caseSensitive?: boolean, wholeWord?: boolean): Collection<Snowflake, Guild>;
        public resolveMember(text: string, members: Collection<Snowflake, GuildMember>, caseSensitive?: boolean, wholeWord?: boolean): GuildMember;
        public resolveMembers(text: string, members: Collection<Snowflake, GuildMember>, caseSensitive?: boolean, wholeWord?: boolean): Collection<Snowflake, GuildMember>;
        public resolvePermissionNumber(number: number): string[];
        public resolveRole(text: string, roles: Collection<Snowflake, Role>, caseSensitive?: boolean, wholeWord?: boolean): Role;
        public resolveRoles(text: string, roles: Collection<Snowflake, Role>, caseSensitive?: boolean, wholeWord?: boolean): Collection<Snowflake, Role>;
        public resolveUser(text: string, users: Collection<Snowflake, User>, caseSensitive?: boolean, wholeWord?: boolean): User;
        public resolveUsers(text: string, users: Collection<Snowflake, User>, caseSensitive?: boolean, wholeWord?: boolean): Collection<Snowflake, User>;
    }

    export class Command extends AkairoModule {
        public constructor(id: string, exec: ((message: Message, args: any) => any) | CommandOptions, options?: CommandOptions);

        public aliases: string[];
        public args: (Argument | Argument[] | ArgumentCancelFunction)[];
        public category: Category<string, Command>;
        public channel?: string;
        public readonly client: AkairoClient;
        public clientPermissions: PermissionResolvable | PermissionResolvable[] | PermissionFunction;
        public cooldown?: number;
        public defaultPrompt: ArgumentPromptOptions;
        public description: string;
        public editable: boolean;
        public readonly filepath: string;
        public readonly handler: CommandHandler;
        public id: string;
        public options: any;
        public ownerOnly: boolean;
        public prefix?: string | string[] | PrefixFunction;
        public protected: boolean;
        public ratelimit: number;
        public split: ArgumentSplit | ArgumentSplitFunction;
        public typing: boolean;
        public userPermissions: PermissionResolvable | PermissionResolvable[] | PermissionFunction;

        protected _splitText(content: string, message: Message): string[];
        protected _getPrefixes(): any[];

        public condition(message): boolean;
        public disable(): boolean;
        public enable(): boolean;
        public exec(message: Message, args: any): any;
        public parse(content: string, message: Message): Promise<any>;
        public reload(): this;
        public remove(): this;
        public trigger(message: Message): RegExp;
    }

    export class CommandHandler extends AkairoHandler {
        public constructor(client: AkairoClient);

        public aliases: Collection<string, string>;
        public blockBots: boolean;
        public blockClient: boolean;
        public blockNotSelf: boolean;
        public categories: Collection<string, Category<string, Command>>;
        public readonly classToHandle: Function;
        public readonly client: AkairoClient;
        public commandUtil: boolean;
        public commandUtilLifetime: number;
        public commandUtils: Collection<string, CommandUtil>;
        public cooldowns: Collection<string, any>;
        public defaultCooldown: number;
        public defaultPrompt: ArgumentPromptOptions;
        public readonly directory: string;
        public fetchMembers: boolean;
        public handleEdits: boolean;
        public modules: Collection<string, Command>;
        public prefixes: Collection<string | PrefixFunction, Set<string>>;
        public prompts: Collection<string, Set<any>>;
        public resolver: TypeResolver;

        protected _addAliases(command: Command): void;
        protected _handleConditional(message: Message): Promise<void>;
        protected _handleCooldowns(message: Message, command: Command): boolean;
        protected _handleError(err: Error, message: Message, command?: Command): void;
        protected _handleRegex(message: Message): Promise<void>;
        protected _handleTriggers(message: Message): Promise<void>;
        protected _parseCommand(message: Message): any;
        protected _parseOverwrittenCommand(message: Message): any;
        protected _removeAliases(command: Command): void;
        protected _runInhibitors(message: Message, command: Command): boolean;

        protected _deregister(command: Command): void;
        protected _register(command: Command, filepath?: string): void;

        public add(filename: string): Command;
        public addPrompt(message: Message): void;
        public allowMention(message: Message): boolean;
        public findCategory(name: string): Category<string, Command>;
        public findCommand(name: string): Command;
        public handle(message: Message): Promise<void>;
        public hasPrompt(message: Message): boolean;
        public load(thing: string | Command): Command;
        public loadAll(): this;
        public prefix(message: Message): string | string[];
        public reload(id: string): Command;
        public reloadAll(): this;
        public remove(id: string): Command;
        public removeAll(): this;
        public removePrompt(message: Message): void;
        public on(event: 'disable' | 'enable' | 'remove', listener: (command: Command) => any): this;
        public on(event: 'load', listener: (command: Command, isReload: boolean) => any): this;
        public on(event: 'commandBlocked', listener: (message: Message, command: Command, reason: string) => any): this;
        public on(event: 'commandCancelled' | 'commandDisabled', listener: (message: Message, command: Command) => any): this;
        public on(event: 'commandFinished', listener: (message: Message, command: Command, args: any, returnValue: any) => any): this;
        public on(event: 'commandStarted', listener: (message: Message, command: Command, args: any) => any): this;
        public on(event: 'cooldown', listener: (message: Message, command: Command, remaining: number) => any): this;
        public on(event: 'error', listener: (error: Error, message: Message, command: Command) => any): this;
        public on(event: 'inPrompt' | 'messageInvalid', listener: (message: Message) => any): this;
        public on(event: 'messageBlocked', listener: (message: Message, reason: string) => any): this;
        public on(event: 'missingPermissions', listener: (message: Message, command: Command, type: 'client' | 'user', missing?: PermissionResolvable[]) => any): this;
    }

    export class CommandUtil {
        public constructor(client: AkairoClient, message: Message);

        public alias?: string;
        public readonly client: AkairoClient;
        public command?: Command;
        public content?: string;
        public lastResponse?: Message;
        public message: Message;
        public prefix?: string;
        public shouldEdit: boolean;

        public static swapOptions(content: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | MessageEditOptions, options?: MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | MessageEditOptions): any[];

        public edit(content: string | string[] | MessageEmbed | MessageEditOptions, options?: MessageEmbed | MessageEditOptions): Promise<Message>;
        public reply(content: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | MessageEditOptions, options?: MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | MessageEditOptions): Promise<Message | Message[]>;
        public send(content: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | MessageEditOptions, options?: MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | MessageEditOptions): Promise<Message | Message[]>;
        public sendNew(content: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions, options?: MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions): Promise<Message | Message[]>;
        public setLastResponse(message: Message | Message[]): Message;
    }

    export class Inhibitor extends AkairoModule {
        public constructor(id: string, exec: ((message: Message, command?: Command) => boolean | Promise<boolean>) | InhibitorOptions, options?: InhibitorOptions);

        public category: Category<string, Inhibitor>;
        public readonly client: AkairoClient;
        public enabled: boolean;
        public readonly filepath: string;
        public readonly handler: InhibitorHandler;
        public id: string;
        public reason: string;
        public type: string;

        public disable(): boolean;
        public enable(): boolean;
        public exec(message: Message, command?: Command): boolean | Promise<boolean>;
        public reload(): this;
        public remove(): this;
    }

    export class InhibitorHandler extends AkairoHandler {
        public constructor(client: AkairoClient);

        public categories: Collection<string, Category<string, Inhibitor>>;
        public readonly classToHandle: Function;
        public readonly client: AkairoClient;
        public readonly directory: string;
        public modules: Collection<string, Inhibitor>;

        protected _deregister(inhibitor: Inhibitor): void;
        protected _register(inhibitor: Inhibitor, filepath?: string): void;

        public add(filename: string): Inhibitor;
        public findCategory(name: string): Category<string, Inhibitor>;
        public load(thing: string | Inhibitor): Inhibitor;
        public loadAll(): this;
        public reload(id: string): Inhibitor;
        public reloadAll(): this;
        public remove(id: string): Inhibitor;
        public removeAll(): this;
        public test(type: 'all' | 'pre' | 'post', message: Message, command?: Command): Promise<string | void>;
        public on(event: 'disable' | 'enable' | 'remove', listener: (inhibitor: Inhibitor) => any): this;
        public on(event: 'load', listener: (inhibitor: Inhibitor, isReload: boolean) => any): this;
    }

    export class Listener extends AkairoModule {
        public constructor(id: string, exec: ((...args: any[]) => any) | ListenerOptions, options?: ListenerOptions);

        public category: Category<string, Listener>;
        public readonly client: AkairoClient;
        public emitter: string | EventEmitter;
        public enabled: boolean;
        public event: string;
        public readonly filepath: string;
        public readonly handler: InhibitorHandler;
        public type: string;

        public disable(): boolean;
        public enable(): boolean;
        public exec(...args: any[]): any;
        public reload(): this;
        public remove(): this;
    }

    export class ListenerHandler extends AkairoHandler {
        public constructor(client: AkairoClient);

        public categories: Collection<string, Category<string, Listener>>;
        public readonly classToHandle: Function;
        public readonly client: AkairoClient;
        public readonly directory: string;
        public emitters: Collection<string, EventEmitter>;
        public modules: Collection<string, Listener>;

        protected _deregister(listener: Listener): void;
        protected _register(listener: Listener, filepath?: string): void;

        public add(filename: string): Listener;
        public deregister(id: string): Listener;
        public findCategory(name: string): Category<string, Listener>;
        public load(thing: string | Listener): Listener;
        public loadAll(): this;
        public register(id: string): Listener;
        public reload(id: string): Listener;
        public reloadAll(): this;
        public remove(id: string): Listener;
        public removeAll(): this;
        public on(event: 'disable' | 'enable' | 'remove', listener: (listener: Listener) => any): this;
        public on(event: 'load', listener: (listener: Listener, isReload: boolean) => any): this;
    }

    export abstract class Provider {
        public items: Collection<string, any>;

        public abstract clear(id: string): any;
        public abstract delete(id: string, key: string): any;
        public abstract get(id: string, key: string, defaultValue: any): any;
        public abstract init(): any;
        public abstract set(id: string, key: string, value: any): any;
    }

    export class SequelizeProvider extends Provider {
        public constructor(table: Model<any, any>, options?: ProviderOptions);

        public dataColumn?: string;
        public idColumn: string;
        public items: Collection<string, any>;
        public table: Model<any, any>;

        public clear(id: string): Bluebird<void>;
        public delete(id: string, key: string): Bluebird<boolean>;
        public get(id: string, key: string, defaultValue: any): any;
        public init(): Bluebird<void>;
        public set(id: string, key: string, value: any): Bluebird<boolean>;
    }

    export class SQLiteProvider extends Provider {
        public constructor(db: Database | Promise<Database>, tableName: string, options?: ProviderOptions);

        public dataColumn?: string;
        public db: Database;
        public idColumn: string;
        public items: Collection<string, any>;
        public tableName: string;

        public clear(id: string): Promise<Statement>;
        public delete(id: string, key: string): Promise<Statement>;
        public get(id: string, key: string, defaultValue: any): any;
        public init(): Promise<void>;
        public set(id: string, key: string, value: any): Promise<Statement>;
    }

    export class TypeResolver {
        public constructor(handler: CommandHandler);

        public readonly client: AkairoClient;
        public handler: CommandHandler;
        public types: Collection<string, ArgumentTypeFunction>;

        protected _addBuiltInTypes(): void;

        public addType(name: string, resolver: ArgumentTypeFunction): this;
        public addTypes(types: { [x: string]: ArgumentTypeFunction }): this;
        public type(name: string): ArgumentTypeFunction;
    }

    export class Util {
        public static isEventEmitter(value: any): boolean;
        public static isPromise(value: any): boolean;
    }

    export type AkairoOptions = {
        allowMention?: boolean | AllowMentionFunction;
        automateCategories?: boolean;
        blockBots?: boolean;
        blockClient?: boolean;
        blockNotSelf?: boolean;
        commandDirectory?: string;
        commandUtil?: boolean;
        commandUtilLifetime?: number;
        defaultCooldown?: number;
        defaultPrompt?: ArgumentPromptOptions;
        emitters?: { [x: string]: EventEmitter };
        fetchMembers?: boolean;
        handleEdits?: boolean;
        inhibitorDirectory?: string;
        listenerDirectory?: string;
        prefix?: string | string[] | PrefixFunction;
        selfbot?: boolean;
        ownerID?: string | string[];
    };

    export type AkairoHandlerOptions = {
        directory?: string;
        classToHandle?: string;
        extenstions?: string[] | Set<string>;
    };

    export type AllowMentionFunction = (message: Message) => boolean;

    export type ArgumentAllowFunction = (message: Message, args: any) => boolean;

    export type ArgumentCancelFunction = (message: Message, args: any) => string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions;

    export type ArgumentDefaultFunction = (message: Message, args: any) => any;

    export type ArgumentMatch = 'word' | 'rest' | 'separate' | 'prefix' | 'flag' | 'text' | 'content' | 'none';

    export type ArgumentMatchFunction = (message: Message, args: any) => ArgumentMatch;

    export type ArgumentOptions = {
        allow?: ArgumentAllowFunction;
        default?: ArgumentDefaultFunction | any;
        description?: string | string[];
        id: string;
        index?: number;
        limit?: number;
        match?: ArgumentMatch | ArgumentMatchFunction;
        prefix?: string | string[];
        prompt?: ArgumentPromptOptions;
        type?: ArgumentType | ArgumentTypeFunction;
    };

    export type ArgumentPromptData = {
        infinite: boolean;
        message: Message;
        retries: number;
        word: string;
    };

    export type ArgumentPromptFunction = (message: Message, args: any, data: ArgumentPromptData) => string | string[] | MessageOptions;

    export type ArgumentPromptModifyFunction = (text: string, message: Message, args: any, data: ArgumentPromptData) => string | string[] | MessageOptions;

    export type ArgumentPromptOptions = {
        cancel?: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | ArgumentPromptFunction;
        cancelWord?: string;
        ended?: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | ArgumentPromptFunction;
        infinite?: boolean;
        limit?: number;
        modifyCancel?: ArgumentPromptModifyFunction;
        modifyEnded?: ArgumentPromptModifyFunction;
        modifyRetry?: ArgumentPromptModifyFunction;
        modifyStart?: ArgumentPromptModifyFunction;
        modifyTimeout?: ArgumentPromptModifyFunction;
        optional?: boolean;
        retries?: number;
        retry?: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | ArgumentPromptFunction;
        start?: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | ArgumentPromptFunction;
        stopWord?: string;
        time?: number;
        timeout?: string | string[] | MessageEmbed | MessageAttachment | MessageAttachment[] | MessageOptions | ArgumentPromptFunction;
    };

    export type ArgumentSplit = 'plain' | 'split' | 'quoted' | 'sticky' | 'none' | string | RegExp;

    export type ArgumentSplitFunction = (content: string, message: Message) => string[];

    export type ArgumentType = 'string' | 'lowercase' | 'uppercase' | 'charCodes' | 'number' | 'integer' | 'dynamic' | 'dynamicInt' | 'url' | 'date' | 'color' | 'user' | 'users' | 'member' | 'members' | 'relevant' | 'relevants' | 'channel' | 'channels' | 'textChannel' | 'textChannels' | 'voiceChannel' | 'voiceChannels' | 'role' | 'roles' | 'emoji' | 'emojis' | 'guild' | 'guilds' | 'message' | 'invite' | 'memberMention' | 'channelMention' | 'roleMention' | 'emojiMention' | 'commandAlias' | 'command' | 'inhibitor' | 'listener' | (string | string[])[];

    export type ArgumentTypeFunction = (word: string, message: Message, args: any) => any;

    export type CommandOptions = {
        aliases?: string[];
        args?: (ArgumentOptions | ArgumentOptions[] | ArgumentCancelFunction)[];
        category?: string;
        channel?: string;
        clientPermissions?: PermissionResolvable | PermissionResolvable[] | PermissionFunction;
        condition?: ConditionFunction;
        cooldown?: number;
        defaultPrompt?: ArgumentPromptOptions;
        description?: string | string[];
        editable?: boolean;
        options?: any;
        ownerOnly?: boolean;
        prefix?: string | string[] | PrefixFunction;
        protected?: boolean;
        ratelimit?: number;
        split?: ArgumentSplit | ArgumentSplitFunction;
        trigger?: RegExp | TriggerFunction;
        typing?: boolean;
        userPermissions?: PermissionResolvable | PermissionResolvable[] | PermissionFunction;
    };

    export type ConditionFunction = (message: Message) => boolean;

    export type InhibitorOptions = {
        category?: string;
        reason?: string;
        type?: string;
    };

    export type ListenerOptions = {
        category?: string;
        emitter?: string | EventEmitter;
        event?: string;
        type?: string;
    };

    export type ModuleOptions = {
        category?: string;
    };

    export type PermissionFunction = (message: Message) => boolean | Promise<boolean>;

    export type PrefixFunction = (message: Message) => string | string[];

    export type ProviderOptions = {
        dataColumn?: string;
        idColumn?: string;
    };

    export type TriggerFunction = (message: Message) => RegExp;

    export const version: string;
}
