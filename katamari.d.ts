declare function Katamari(url?: string, ssl?: boolean, protocols?: Array<string>): katamari.Katamari;

declare namespace katamari {
  type MessageData = Object | Array<any> | string | number
  type Entry = {
    data: MessageData,
    created: number,
    updated: number,
    index: string
  }
  type Data = Entry | Array<Entry>
  type Stats = {
    keys: Array<string>
  }
  interface Katamari extends Object {
    cache: MessageData
    forcedClose: Boolean
    readyState: Number
    frozen: Boolean
    connect(reconnectAttempt?: boolean): void
    close(reload?: boolean): void

    onopen(ev: Event): void
    onclose(ev: CloseEvent): void
    onconnecting(): void
    onmessage(data: MessageData): void
    onerror(ev: ErrorEvent): void
    onfrozen(ev: Event): void
    onresume(ev: Event): void

    encode(data: MessageData, index?: string): string
    decode(ev: MessageEvent): Data
    parseTime(ev: MessageEvent): number

    stats(): Stats
    get(key: string): Data
    publish(key: string, data: MessageData): string
    unpublish(key: string): void
  }
}

export = Katamari