type BaseParameter = {
  description?: string;
  secondaryDescription?: string;
  showBottomHr?: boolean;
};

type StringParameter = BaseParameter & {
  type: "string";
  useTextArea?: boolean;
  default: string;
};

type PasswordParameter = BaseParameter & {
  type: "password";
  default: string;
};

type BooleanParameter = BaseParameter & {
  type: "boolean";
  default: boolean;
};

type NumberParameter = BaseParameter & {
  type: "number";
  default: number;
};

type EnumParameter = BaseParameter & {
  type: "enum";
  options: Array<string | number>;
  default: string | number;
};

type FilepathParameter = BaseParameter & {
  type: "filepath";
  fileOptions?: {
    directoryOnly: boolean;
    filters: Array<{
      name: string;
      extensions: string[];
    }>;
    title: string;
    buttonLabel: string;
  };
};

type EffectListParameter = BaseParameter & {
  type: "effectlist";
};

type TriggersObject = {
  [T in TriggerType]?: T extends "event" ? string[] | boolean : boolean;
};

type UserAccount = {
  username: string;
  displayName: string;
  userId: string;
  avatar: string;
  loggedIn: boolean;
  auth: {
    access_token: string;
    expires_at: string;
    refresh_token: string;
  };
};

type CustomScriptManifest = {
  name: string;
  description: string;
  version: string;
  author: string;
  website?: string;
  startupOnly?: boolean;
  firebotVersion?: "5";
};

type TriggerType =
  | "command"
  | "custom_script"
  | "startup_script"
  | "api"
  | "event"
  | "hotkey"
  | "timer"
  | "counter"
  | "preset"
  | "manual";

type Trigger = {
  type: TriggerType;
  metadata: {
    username: string;
    hotkey?: any;
    command?: any;
    userCommand?: { trigger: string; args: string[] };
    chatMessage?: any;
    event?: { id: string; name: string };
    eventSource?: { id: string; name: string };
    eventData?: Record<string, unknown>;
    [x: string]: unknown;
  };
};

interface LeveledLogMethod {
  (msg: string, ...meta: any[]): void;
}

type ScriptModules = {
  effectManager: {
    registerEffect: <EffectModel>(
      effectType: Firebot.EffectType<EffectModel>
    ) => void;
  };
  eventManager: {
    registerEventSource: (eventSource: Firebot.EventSource) => void;
    triggerEvent: (
      sourceId: string,
      eventId: string,
      meta: Record<string, unknown>,
      isManual?: boolean
    ) => void;
  };
  frontendCommunicator: {
    send(eventName: string, data: unknown): void;
    on<ExpectedArgs extends Array<any> = [], ReturnPayload = void>(
      eventName: string,
      callback: (...args: ExpectedArgs[]) => ReturnPayload
    ): void;
    onAsync<ExpectedArgs extends Array<any> = [], ReturnPayload = void>(
      eventName: string,
      callback: (...args: ExpectedArgs[]) => Promise<ReturnPayload>
    ): void;
  };
  twitchChat: {
    sendChatMessage(
      message: string,
      whisperTarget?: string,
      accountType?: "bot" | "streamer"
    ): void;
  };
  logger: {
    debug: LeveledLogMethod;
    info: LeveledLogMethod;
    warn: LeveledLogMethod;
    error: LeveledLogMethod;
  };
  replaceVariableManager: {
    registerReplaceVariable(replaceVariable: Firebot.ReplaceVariable): void;
  };
  eventFilterManager: {
    registerFilter(filter: Firebot.EventFilter): void;
  };
};

type RunRequest<P extends Record<string, any>> = {
  parameters: P;
  modules: ScriptModules;
  firebot: {
    accounts: {
      streamer: UserAccount;
      bot: UserAccount;
    };
    settings: {
      webServerPort: number;
    };
    version: string;
  };
  trigger: Trigger;
};

type ScriptParameter =
  | StringParameter
  | PasswordParameter
  | BooleanParameter
  | NumberParameter
  | EnumParameter;

type DefaultParametersConfig<P> = {
  [K in keyof P]: P[K] extends string
    ? StringParameter | PasswordParameter | FilepathParameter
    : P[K] extends number
    ? NumberParameter
    : P[K] extends boolean
    ? BooleanParameter
    : P[K] extends Array<any>
    ? EnumParameter
    : P[K] extends Firebot.EffectList
    ? EffectListParameter
    : ScriptParameter;
};

type Effect = {
  id?: string;
  type: Firebot.KnownEffectType;
  [x: string]: unknown;
};

type ScriptReturnObject = {
  success: boolean;
  errorMessage?: string;
  effects: Array<Effect> | Firebot.EffectList;
  callback?: VoidFunction;
};

type EffectCategory =
  | "common"
  | "chat based"
  | "Moderation"
  | "overlay"
  | "fun"
  | "integrations"
  | "advanced"
  | "scripting";

export namespace Firebot {
  type CustomScript<P extends Record<string, any> = {}> = {
    getScriptManifest():
      | CustomScriptManifest
      | PromiseLike<CustomScriptManifest>;
    getDefaultParameters(): DefaultParametersConfig<P>;
    run(
      runRequest: RunRequest<P>
    ): void | ScriptReturnObject | Promise<ScriptReturnObject>;
  };

  type EventSource = {
    id: string;
    name: string;
    events: Array<{
      id: string;
      name: string;
      description: string;
      cached?: boolean;
      manualMetadata?: Record<string, unknown>;
    }>;
  };

  type ReplaceVariable = {
    definition: {
      handle: string;
      usage?: string;
      description: string;
      examples?: Array<{
        usage: string;
        description: string;
      }>;
      triggers?: TriggersObject;
      possibleDataOutput: Array<"text" | "number">;
    };
    evaluator(trigger: Trigger, ...args: any[]): any;
  };

  type EventFilter = {
    id: string;
    name: string;
    description: string;
    events: Array<{
      eventSourceId: string;
      eventId: string;
    }>;
    comparisonTypes: string[];
    valueType: "text" | "preset";
    presetValues(...args: any[]): Promise<any[]>;
    predicate(
      filterSettings: { comparisonType: string; value: any },
      eventData: {
        eventSourceId: string;
        eventId: string;
        eventMeta: Record<string, any>;
      }
    ): Promise<boolean>;
  };

  type EffectType<EffectModel> = {
    definition: {
      id: string;
      name: string;
      description: string;
      icon: string;
      categories: EffectCategory[];
      triggers?: TriggerType[] | TriggersObject;
      dependencies?: Array<"chat">;
    };
    optionsTemplate: string;
    optionsController?: (...args: any[]) => void;
    optionsValidator?: (effect: EffectModel) => string[];
    onTriggerEvent: (event: {
      effect: EffectModel;
      trigger: Trigger;
    }) => Promise<boolean>;
    overlayExtension?: {
      dependencies: {
        css: string[];
        js: string[];
      };
      event: {
        name: string;
        onOverlayEvent: (data: any) => void;
      };
    };
  };

  type EffectList = {
    id?: string;
    queue?: string;
    queueDuration?: number;
    list: Effect[];
  };

  type KnownEffectType =
    | "firebot:chat"
    | "firebot:currency"
    | "firebot:delay"
    | "firebot:run-effect-list"
    | "firebot:filewriter"
    | "firebot:html"
    | "firebot:loopeffects"
    | "firebot:playsound"
    | "firebot:playvideo"
    | "firebot:randomeffect"
    | "firebot:runcommand"
    | "firebot:sequentialeffect"
    | "firebot:set-user-metadata"
    | "firebot:showImage"
    | "firebot:showtext";
}
