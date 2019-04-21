declare function Samo(url: string, ssl?: boolean, protocols?: Array<string>): samo.Samo;

declare namespace samo {
  type MessageData = Object<any> | Array<any> | string | number
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
    close(): void
    onopen(ev: Event): void
    onclose(ev: CloseEvent): void
    onconnecting(): void
    onmessage(data: Message): void
    onerror(ev: ErrorEvent): void
    close(reload: boolean): void

    encode(data: Message, index?: string): string
    decode(ev: MessageEvent): Data
    parseTime(ev: MessageEvent): number

    set(data: Message, index?: string): void
    del(index: string): void
    async rstats(url?: string): Stats
    async rget(mode: string, key: string, url?: string): Data
    async rpost(mode: string, key: string, data: Message, index?: string, url?: string): string
    async rdel(key: string, url: string): void
  }
}

export = Samo