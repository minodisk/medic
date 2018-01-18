declare module "listr" {
  declare class Listr<C> {
    constructor(items: Array<ListrItem<C>>, options: Options): Listr;
    add(item: ListrItem<C>): void;
    run(ctx: C): Promise<void>;
  }

  declare type ListrItem<C> = {
    title: string,
    skip?: () => boolean | string,
    task: (
      ctx: C,
      task: Task,
    ) => void | Promise<void | string> | Observable | Listr,
  };

  declare type Task = {
    output: string,
    skip(reason: string): void,
  };

  declare type Options = {
    concurrent?: boolean | number,
    exitOnError?: boolean,
    renderer: string | Renderer,
    nonTTYRenderer: string | Renderer,
  };

  declare interface Renderer {
    static get nonTTY(): boolean;
    constructor(items: Array<ListrItem>, options: Options): Renderer;
    render(): void;
    end(err: Error): void;
  }

  declare module.exports: typeof Listr;
}

