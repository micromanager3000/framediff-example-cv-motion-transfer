declare global {
  namespace App {}
  interface Window {
    __frameDiffBakeComposition?: (id: string) => Promise<string>;
  }
}
export {};
