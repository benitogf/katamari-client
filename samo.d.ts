declare function Samo(url?: string, ssl?: boolean, protocols?: Array<string>): samo.Samo;

declare namespace samo {
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
  interface Samo extends Object {
    cache: MessageData
    close(): void
    onopen(ev: Event): void
    onclose(ev: CloseEvent): void
    onconnecting(): void
    onmessage(data: MessageData): void
    onerror(ev: ErrorEvent): void
    close(reload: boolean): void

    encode(data: MessageData, index?: string): string
    decode(ev: MessageEvent): Data
    parseTime(ev: MessageEvent): number

    set(data: MessageData, index?: string): void
    del(index: string): void
    rstats(url?: string): Stats
    rget(mode: string, key: string, url?: string): Data
    rpost(mode: string, key: string, data: MessageData, index?: string, url?: string): string
    rdel(key: string, url: string): void
  }
}

export = Samo